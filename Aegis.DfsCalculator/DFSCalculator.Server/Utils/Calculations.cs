using Aegis.DfsCalculator.Server.Controllers;
using Aegis.DfsCalculator.Server.Data;
using System.Text.RegularExpressions;
using static System.Runtime.InteropServices.JavaScript.JSType;
using String = System.String;

namespace Aegis.DfsCalculator.Server.Utils
{
    public class ServerCalculations
    {
        // Configuration flag for I0020 dependency methodology
        const bool USE_I0020_DEPENDENCIES = true;
        static List<string> ANA = new List<string> { "07", "09", "10", "88" };
        static List<string> VALID = new List<string> { "01", "02", "03", "04", "05", "06" };
        static List<string> MODERATELY_IMPAIRED = new List<string> { "08", "09", "10", "11", "12" };
        static List<string> SEVERELY_IMPAIRED = new List<string> { "01", "02", "03", "04", "05", "06", "07" };
        static Dictionary<string, string> BOWEL_CONTINENCE_MAP = new Dictionary<string, string> { { "1", "Occasionally" }, { "2", "Frequently" }, { "3", "Always" }, { "9", "Not Rated" } };
        static Dictionary<string, string> URINE_CONTINENCE_MAP = new Dictionary<string, string> { { "1", "Occasionally" }, { "2", "Frequently" }, { "3", "Always" }, { "9", "Not Rated" } };

        private static int CalculateAgeAtAdmission(DateTime dob, DateTime admit)
        {
            int age = dob.Year - admit.Year;
            if (!(admit.Month > dob.Month || (admit.Month == dob.Month && admit.Day >= dob.Day)))
            {
                age--;
            }

            return age;
        }

        private static string DetermineMobilityType(Dictionary<string, string> parsedValues)
        {
            if (String.IsNullOrEmpty(parsedValues.GetValueOrDefault("GG0170I1"))) return "Unknown";

            string i1 = parsedValues.GetValueOrDefault("GG0170I1");
            string i3 = parsedValues.GetValueOrDefault("GG0170I3");
            string r1 = parsedValues.GetValueOrDefault("GG0170R1");
            string r3 = parsedValues.GetValueOrDefault("GG0170R3");
            string s1 = parsedValues.GetValueOrDefault("GG0170S1");
            string s3 = parsedValues.GetValueOrDefault("GG0170S3");

            return ANA.Any(i => i == i1) &&
                ANA.Any(i => i == i3) &&
                (VALID.Any(i => i == r1) || VALID.Any(i => i == r3) || VALID.Any(i => i == s1) || VALID.Any(i => i == s3))
                ? "Wheel"
                : "Walk";
        }

        private static double ResolveScore(string? rawValue)
        {
            if (rawValue == null) return 0;
            if (VALID.Contains(rawValue)) return int.Parse(rawValue);
            if (double.TryParse(rawValue, System.Globalization.NumberStyles.Float, 
                System.Globalization.CultureInfo.InvariantCulture, out double parsed) 
                && parsed >= 1 && parsed <= 6)
                return parsed;
            return 1;
        }

        private static double CalculateFunctionScore(Dictionary<string, string> startScores, string? mobilityType = null)
        {
            if (!String.IsNullOrEmpty(mobilityType))
            {
                mobilityType = DetermineMobilityType(startScores);
            }
            
            double sa = ResolveScore(startScores.GetValueOrDefault("GG0130A"));
            double sb = ResolveScore(startScores.GetValueOrDefault("GG0130B"));
            double sc = ResolveScore(startScores.GetValueOrDefault("GG0130C"));

            double ma = ResolveScore(startScores.GetValueOrDefault("GG0170A"));
            double mc = ResolveScore(startScores.GetValueOrDefault("GG0170C"));
            double md = ResolveScore(startScores.GetValueOrDefault("GG0170D"));
            double me = ResolveScore(startScores.GetValueOrDefault("GG0170E"));
            double mf = ResolveScore(startScores.GetValueOrDefault("GG0170F"));
            double mi = ResolveScore(startScores.GetValueOrDefault("GG0170I"));
            double mj = ResolveScore(startScores.GetValueOrDefault("GG0170J"));
            double mr = ResolveScore(startScores.GetValueOrDefault("GG0170R"));

            if (mobilityType == "Wheel")
            {
                return sa + sb + sc + ma + mc + md + me + mf + mr + mr;
            }
            else
            {
                return sa + sb + sc + ma + mc + md + me + mf + mi + mj;
            }
        }

        private static string? GetAgeCovariate(int? age)
        {
            if (age == null)
            {
                return null;
            }
            else if (age <= 54)
            {
                return "≤54 Years";
            }
            else if (age <= 64)
            {
                return "55-64 Years";
            }
            else if (age <= 74)
            {
                return "65-74 Years";
            }
            else if (age <= 84)
            {
                return "75-84 Years";
            }
            else if (age <= 90)
            {
                return "85-90 Years";
            }
            else
            {
                return ">90 Years";
            }
        }

        private static string? ProcessAgeCovariate(Dictionary<string, string> parsedValues, int? age)
        {
            if (age == null)
            {
                age = CalculateAgeAtAdmission(DateTime.Parse(parsedValues.GetValueOrDefault("A0900")), DateTime.Parse(parsedValues.GetValueOrDefault("A1600")));
            }

            return GetAgeCovariate(age);
        }

        private static Dictionary<string, int> ProcessUsesWheelchair(Dictionary<string, string> parsedValues)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            string mobilityType = DetermineMobilityType(parsedValues);
            if (mobilityType == "Wheel")
            {
                covariates["Uses Wheelchair"] = 1;
            }

            return covariates;
        }

        private static Dictionary<string, int> ProcessBMICovariates(Dictionary<string, string> parsedValues)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            double height = Double.Parse(parsedValues.GetValueOrDefault("K0200A"));
            double weight = Double.Parse(parsedValues.GetValueOrDefault("K0200B"));

            double bmi = (height != 0 && weight != 0) ? Math.Round(((weight * 703) / (height * height)) * 10) / 10 : 0;

            if (bmi > 50)
            {
                covariates["High BMI"] = 1;
            }
            if (bmi >= 12 && bmi <= 19)
            {
                covariates["Low BMI"] = 1;
            }

            return covariates;
        }

        private static Dictionary<string, int> ProcessCognitiveFunction(Dictionary<string, string> parsedValues)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            string bims = parsedValues.GetValueOrDefault("C0500");
            List<string> c0900 = new List<string> { "C0900A", "C0900B", "C0900C", "C0900D" }.Select(k => parsedValues.GetValueOrDefault(k)).ToList();
            string c0900z = parsedValues.GetValueOrDefault("C0900Z");

            bool all1s = c0900.Where(v => v == "1").Count() >= 2;

            if (MODERATELY_IMPAIRED.Any(i => i == bims) || all1s)
            {
                covariates["Cognitive Function, BIMS Score: Moderately Impaired - Admission"] = 1;
            }
            else if (SEVERELY_IMPAIRED.Any(i => i == bims) || c0900z == "1" || c0900.Where(v => v == "1").Count() == 1)
            {
                covariates["Cognitive Function, BIMS Score: Severely Impaired - Admission"] = 1;
            }

            return covariates;
        }

        private static Dictionary<string, int> ProcessCommunicationImpairment(Dictionary<string, string> parsedValues)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            string b0700 = parsedValues.GetValueOrDefault("B0700");
            string b0800 = parsedValues.GetValueOrDefault("B0800");

            if (b0700 == "2" || b0700 == "3" || b0800 == "2" || b0800 == "3")
            {
                covariates["Communication Impairment: Moderate to Severe - Admission"] = 1;
            }
            else if (
              (b0700 == "1" && b0800 == "1") ||
              (b0700 == "1" && b0800 == "0") ||
              (b0700 == "0" && b0800 == "1")
          )
            {
                covariates["Communication Impairment: Mild - Admission"] = 1;
            }

            return covariates;
        }

        private static Dictionary<string, int> ProcessContinenceCovariates(Dictionary<string, string> parsedValues)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            string bowel = BOWEL_CONTINENCE_MAP.GetValueOrDefault(parsedValues.GetValueOrDefault("H0400"));
            string urine = URINE_CONTINENCE_MAP.GetValueOrDefault(parsedValues.GetValueOrDefault("H0400"));

            if (bowel == "Always")
            {
                covariates["Bowel Continence: Always Incontinent - Admission"] = 1;
            }
            else if (bowel == "Occasionally" || bowel == "Frequently")
            {
                covariates["Bowel Continence: Occasionally Incontinent, Frequently Incontinent - Admission"] = 1;
            }

            if (urine == "Not Rated")
            {
                covariates["Urinary Continence: Not Rated (Indwelling Urinary Catheter) - Admission"] = 1;
            }
            else if (urine == "Always" || urine == "Frequently" || urine == "Occasionally")
            {
                covariates["Urinary Continence: Occasionally Incontinent, Frequently Incontinent, or Always Incontinent - Admission"] = 1;
            }

            return covariates;
        }

        private static Dictionary<string, int> ProcessPriorFunctioning(Dictionary<string, string> parsedValues)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            // Prior Functioning: Self-Care
            string pfSelfCare = parsedValues.GetValueOrDefault("GG0100A");
            if (pfSelfCare == "1")
            {
                covariates["Prior Functioning, Self-Care: Dependent"] = 1;
            }
            else if (pfSelfCare == "2")
            {
                covariates["Prior Functioning, Self-Care: Some Help"] = 1;
            }

            // Prior Functioning: Indoor Mobility
            string pfMobility = parsedValues.GetValueOrDefault("GG0100B");
            if (pfMobility == "1")
            {
                covariates["Prior Functioning, Indoor Mobility (Ambulation): Dependent"] = 1;
            }
            else if (pfMobility == "2")
            {
                covariates["Prior Functioning, Indoor Mobility (Ambulation): Some Help"] = 1;
            }

            // Prior Functioning: Stairs
            string pfStairs = parsedValues.GetValueOrDefault("GG0100C");
            if (pfStairs == "1")
            {
                covariates["Prior Functioning, Stairs: Dependent"] = 1;
            }
            else if (pfStairs == "2")
            {
                covariates["Prior Functioning, Stairs: Some Help"] = 1;
            }

            // Prior Functioning: Functional Cognition
            string pfCog = parsedValues.GetValueOrDefault("GG0100D");
            if (pfCog == "1")
            {
                covariates["Prior Functioning, Functional Cognition: Dependent"] = 1;
            }

            return covariates;
        }

        private static Dictionary<string, int> ProcessPriorMobilityDevices(Dictionary<string, string> parsedValues)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            if (parsedValues.GetValueOrDefault("GG0110A") == "1" || parsedValues.GetValueOrDefault("GG0110B") == "1")
            {
                covariates["Prior Mobility Device Use: Manual Wheelchair and/or Motorized Wheelchair and/or Scooter"] = 1;
            }
            if (parsedValues.GetValueOrDefault("GG0110C") == "1")
            {
                covariates["Prior Mobility Device Use: Mechanical Lift"] = 1;
            }
            if (parsedValues.GetValueOrDefault("GG0110D") == "1")
            {
                covariates["Prior Mobility Device Use: Walker"] = 1;
            }
            if (parsedValues.GetValueOrDefault("GG0110E") == "1")
            {
                covariates["Prior Mobility Device Use: Orthotics/Prosthetics"] = 1;
            }

            return covariates;
        }

        private static Dictionary<string, int> ProcessMedicalConditionCategory(Dictionary<string, string> parsedValues, int startScore)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            string conditionCode = parsedValues.GetValueOrDefault("I0020");
            string conditionLabel = ConditionMap.CONDITION_MAP.GetValueOrDefault(conditionCode);
            if (!String.IsNullOrEmpty(conditionLabel))
            {
                string key = $"Primary Medical Condition Category: {conditionLabel}";
                covariates[key] = 1;

                string interactionKey = $"Interaction of Admission Function Score and {key}";
                covariates[interactionKey] = startScore;
            }

            return covariates;
        }

        private static Dictionary<string, int> ProcessHCCConditions(Dictionary<string, string> parsedValues, List<string> icdList)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            icdList = icdList.Select(icd => Regex.Replace(icd, @"[^A-Z0-9]", "")).ToList();
            List<int> hccList = icdList.Select(icd => ICDtoHCC.ICD_TO_HCC.GetValueOrDefault(icd)).ToList();

            // Amputations (new combined)
            if (USE_I0020_DEPENDENCIES)
            {
                if (parsedValues.GetValueOrDefault("I0020") != "08")
                {
                    if (
                      parsedValues.GetValueOrDefault("GG0120D") == "1" ||
                      Int32.Parse(parsedValues.GetValueOrDefault("O0500I") != "^" ? parsedValues.GetValueOrDefault("O0500I") : "0") >= 1 ||
                      hccList.Any(hcc => hcc == 173) ||
                      hccList.Any(hcc => hcc == 189)
                    )
                    {
                        covariates["Amputations: Traumatic Amputations and Complications (HCC173), Amputation Status, Lower Limb/Amputation Complications (HCC189), Amputation Status, Lower Limb/ Amputation Complications (HCC189)"] = 1;
                    }
                }
            }
            else
            {
                if (
                  parsedValues.GetValueOrDefault("GG0120D") == "1" ||
                  Int32.Parse(parsedValues.GetValueOrDefault("O0500I") != "^" ? parsedValues.GetValueOrDefault("O0500I") : "0") >= 1 ||
                  hccList.Any(hcc => hcc == 173) ||
                  hccList.Any(hcc => hcc == 189)
                )
                {
                    covariates["Amputations: Traumatic Amputations and Complications (HCC173), Amputation Status, Lower Limb/Amputation Complications (HCC189), Amputation Status, Lower Limb/ Amputation Complications (HCC189)"] = 1;
                }
            }

            // Aspiration/Bacterial Pneumonia (HCC114, HCC115) or I2000=1 and I0020 ≠ "12"
            if (USE_I0020_DEPENDENCIES)
            {
                if (parsedValues.GetValueOrDefault("I0020") != "12")
                {
                    if (hccList.Any(hcc => hcc == 114) || hccList.Any(hcc => hcc == 115) || parsedValues.GetValueOrDefault("I2000") == "1")
                    {
                        covariates["Aspiration, Bacterial, and Other Pneumonias: Aspiration and Specified Bacterial Pneumonias (HCC114), Pneumococcal Pneumonia, Empyema, Lung Abscess (HCC115)"] = 1;
                    }
                }
            }
            else
            {
                if (hccList.Any(hcc => hcc == 114) || hccList.Any(hcc => hcc == 115) || parsedValues.GetValueOrDefault("I2000") == "1")
                {
                    covariates["Aspiration, Bacterial, and Other Pneumonias: Aspiration and Specified Bacterial Pneumonias (HCC114), Pneumococcal Pneumonia, Empyema, Lung Abscess (HCC115)"] = 1;
                }
            }

            // CKD (HCC137-139) or I1500=1
            if (
              parsedValues.GetValueOrDefault("I1500") == "1" ||
              hccList.Any(hcc => hcc == 137) ||
              hccList.Any(hcc => hcc == 138) ||
              hccList.Any(hcc => hcc == 139)
            )
            {
                covariates["Chronic Kidney Disease - Stages 1-4, Unspecified: Chronic Kidney Disease, Severe (Stage 4) (HCC137), Chronic Kidney Disease, Moderate (Stage 3) (HCC138), Chronic Kidney Disease, Mild or Unspecified (Stages 1-2 or Unspecified) (HCC139)"] = 1;
            }

            // Cancer - Colorectal/Bladder/Other (HCC11)
            if (hccList.Any(hcc => hcc == 11))
            {
                covariates["Colorectal, Bladder, and Other Cancers (HCC11)"] = 1;
            }

            // Hemiplegia/Hemiparesis (HCC103) or I4900=1
            if (parsedValues.GetValueOrDefault("I4900") == "1" || hccList.Any(hcc => hcc == 103))
            {
                covariates["Hemiplegia/Hemiparesis (HCC103)"] = 1;
            }

            // Intestinal Obstruction (HCC33)
            if (hccList.Any(hcc => hcc == 33))
            {
                covariates["Intestinal Obstruction/Perforation (HCC33)"] = 1;
            }

            // Lymphoma and Other Cancers (HCC10)
            if (hccList.Any(hcc => hcc == 10))
            {
                covariates["Lymphoma and Other Cancers (HCC10)"] = 1;
            }

            // Major Head Injury (HCC167), I0020 ≠ "01"
            if (USE_I0020_DEPENDENCIES)
            {
                if (hccList.Any(hcc => hcc == 167) && parsedValues.GetValueOrDefault("I0020") != "03")
                {
                    covariates["Major Head Injury (HCC167)"] = 1;
                }
            }
            else
            {
                if (hccList.Any(hcc => hcc == 167))
                {
                    covariates["Major Head Injury (HCC167)"] = 1;
                }
            }

            // Mental Health (HCC57-60 or I6000/I5800/I5900/I5950)
            if (
                parsedValues.GetValueOrDefault("I6000") == "1" || parsedValues.GetValueOrDefault("I5800") == "1" || parsedValues.GetValueOrDefault("I5900") == "1" || parsedValues.GetValueOrDefault("I5950") == "1" ||
                hccList.Any(hcc => hcc >= 57 && hcc <= 60)
            )
            {
                covariates["Mental Health Disorders: Schizophrenia (HCC57), Major Depressive, Bipolar, and Paranoid Disorders (HCC59), Reactive and Unspecified Psychosis (HCC58), Personality Disorders (HCC60)"] = 1;
            }

            // Metastatic Cancer/Acute Leukemia (HCC8) or I0100=1
            if (parsedValues.GetValueOrDefault("I0100") == "1" || hccList.Any(hcc => hcc == 8))
            {
                covariates["Metastatic Cancer and Acute Leukemia (HCC8)"] = 1;
            }

            // Multiple Sclerosis (HCC77) and I0020 ≠ 6
            if (USE_I0020_DEPENDENCIES)
            {
                if (
                  parsedValues.GetValueOrDefault("I0020") != "06" &&
                  (parsedValues.GetValueOrDefault("I5200") == "1" || hccList.Any(hcc => hcc == 77))
                )
                {
                    covariates["Multiple Sclerosis (HCC77)"] = 1;
                }
            }
            else
            {
                if (parsedValues.GetValueOrDefault("I5200") == "1" || hccList.Any(hcc => hcc == 77))
                {
                    covariates["Multiple Sclerosis (HCC77)"] = 1;
                }
            }

            // Other Significant Endocrine Disorders (HCC23)
            if (hccList.Any(hcc => hcc == 23))
            {
                covariates["Other Significant Endocrine and Metabolic Disorders (HCC23)"] = 1;
            }

            // Parkinson's/Huntington's (HCC78) and I0020 ≠ 6
            if (USE_I0020_DEPENDENCIES)
            {
                if (
                  parsedValues.GetValueOrDefault("I0020") != "06" &&
                  (parsedValues.GetValueOrDefault("I5250") == "1" ||
                    parsedValues.GetValueOrDefault("I5300") == "1" ||
                    hccList.Any(hcc => hcc == 78))
                )
                {
                    covariates["Parkinson's and Huntington's Diseases (HCC78)"] = 1;
                }
            }
            else
            {
                if (parsedValues.GetValueOrDefault("I5250") == "1" ||
                    parsedValues.GetValueOrDefault("I5300") == "1" ||
                    hccList.Any(hcc => hcc == 78))
                {
                    covariates["Parkinson's and Huntington's Diseases (HCC78)"] = 1;
                }
            }

            // Tetraplegia/Paraplegia (HCC70, HCC71), I0020 ≠ "04" or "05"
            if (USE_I0020_DEPENDENCIES)
            {
                if (
                    parsedValues.GetValueOrDefault("I0020") != "04" && parsedValues.GetValueOrDefault("I0020") != "05" &&
                    (parsedValues.GetValueOrDefault("I5000") == "1" || parsedValues.GetValueOrDefault("I5100") == "1" ||
                    hccList.Any(hcc => hcc == 70 || hcc == 71))
                )
                {
                    covariates["Tetraplegia (Excluding Complete Tetraplegia) (HCC70) and Paraplegia (HCC71)"] = 1;
                }
            }
            else
            {
                if (parsedValues.GetValueOrDefault("I5000") == "1" ||
                    parsedValues.GetValueOrDefault("I5100") == "1" ||
                    hccList.Any(hcc => hcc == 70 || hcc == 71))
                {
                    covariates["Tetraplegia (Excluding Complete Tetraplegia) (HCC70) and Paraplegia (HCC71)"] = 1;
                }
            }

            // Infectious disease: Septicemia, Sepsis, SIRS/Shock
            if (parsedValues.GetValueOrDefault("I2100") == "1" || hccList.Any(hcc => hcc == 2))
            {
                covariates["Septicemia, Sepsis, Systemic Inflammatory Response Syndrome/Shock (HCC2)"] = 1;
            }

            // Diabetes (with or without complications)
            if (parsedValues.GetValueOrDefault("I2900") == "1" || hccList.Any(hcc => hcc == 18 || hcc == 19))
            {
                covariates["Diabetes: Diabetes With Chronic Complications (HCC18) or Diabetes Without Complications (HCC19)"] = 1;
            }

            // Dementia (with or without complications)
            if (parsedValues.GetValueOrDefault("I4800") == "1" || hccList.Any(hcc => hcc == 51 || hcc == 52))
            {
                covariates["Dementia: Dementia With Complications (HCC51), Dementia Without Complications (HCC52)"] = 1;
            }

            // Renal: Dialysis Status or Chronic Kidney Disease Stage 5
            if (parsedValues.GetValueOrDefault("O0110J1A") == "1" || parsedValues.GetValueOrDefault("O0110J1B") == "1" || hccList.Any(hcc => hcc == 134 || hcc == 136))
            {
                covariates["Dialysis Status (HCC134), Chronic Kidney Disease, Stage 5 (HCC136)"] = 1;
            }

            // Cardiac: Angina Pectoris
            if (USE_I0020_DEPENDENCIES)
            {
                if (parsedValues.GetValueOrDefault("I0020") != "12" && hccList.Any(hcc => hcc == 88))
                {
                    covariates["Angina Pectoris (HCC88)"] = 1;
                }
            }
            else
            {
                if (hccList.Any(hcc => hcc == 88))
                {
                    covariates["Angina Pectoris (HCC88)"] = 1;
                }
            }

            return covariates;
        }

        private static Dictionary<string, int> ProcessAdditionalClinicalConditions(Dictionary<string, string> parsedValues)
        {
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            // Prior Surgery
            if (parsedValues.GetValueOrDefault("J2000") == "1")
            {
                covariates["Prior Surgery"] = 1;
            }

            // No PT or OT on Admission
            int ptSum = new List<string> { "O0400B1", "O0400B2", "O0400B3" }.Sum(k => Int32.Parse(Int32.TryParse(parsedValues.GetValueOrDefault(k), out _) ? parsedValues.GetValueOrDefault(k) : "0"));
            int otSum = new List<string> { "O0400C1", "O0400C2", "O0400C3" }.Sum(k => Int32.Parse(Int32.TryParse(parsedValues.GetValueOrDefault(k), out _) ? parsedValues.GetValueOrDefault(k) : "0"));

            if (ptSum == 0 && otSum == 0)
            {
                covariates["No Physical or Occupational Therapy - Admission"] = 1;
            }

            // No PT or OT on Discharge
            int ptSumDischarge = new List<string> { "O0425B1", "O0425B2", "O0425B3" }.Sum(k => Int32.Parse(Int32.TryParse(parsedValues.GetValueOrDefault(k), out _) ? parsedValues.GetValueOrDefault(k) : "0"));
            int otSumDischarge = new List<string> { "O0425C1", "O0425C2", "O0425C3" }.Sum(k => Int32.Parse(Int32.TryParse(parsedValues.GetValueOrDefault(k), out _) ? parsedValues.GetValueOrDefault(k) : "0"));

            if (ptSumDischarge == 0 && otSumDischarge == 0)
            {
                covariates["No Physical or Occupational Therapy - Discharge"] = 1;
            }

            // Stage 2 Pressure Ulcer on Admission
            if (Int32.Parse(Int32.TryParse(parsedValues.GetValueOrDefault("M0300B1"), out _) ? parsedValues.GetValueOrDefault("M0300B1") : "0") >= 1)
            {
                covariates["Stage 2 Pressure Ulcer - Admission"] = 1;
            }

            // Stage 3, 4 or Unstageable Pressure Ulcer on Admission
            bool hasSevereUlcer = new List<string> { "M0300C1", "M0300D1", "M0300E1", "M0300F1", "M0300G1" }.Any(k => Int32.Parse(Int32.TryParse(parsedValues.GetValueOrDefault(k), out _) ? parsedValues.GetValueOrDefault(k) : "0") >= 1);
            if (hasSevereUlcer)
            {
                covariates["Stage 3, 4 or Unstageable Pressure Ulcer/Injury - Admission"] = 1;
            }

            // History of Falls - Admission
            if (
                parsedValues.GetValueOrDefault("J1700A") == "1" ||
                parsedValues.GetValueOrDefault("J1700B") == "1" ||
                parsedValues.GetValueOrDefault("J1700C") == "1"
            )
            {
                covariates["History of Falls - Admission"] = 1;
            }

            // Nutritional Approaches: Mechanically Altered Diet
            if (parsedValues.GetValueOrDefault("K0520C3") == "1")
            {
                covariates["Nutritional Approaches: Mechanically Altered Diet - Admission"] = 1;
            }

            // TPN, IV Feeding, or Tube Feeding
            if (parsedValues.GetValueOrDefault("K0520A3") == "1" || parsedValues.GetValueOrDefault("K0520B3") == "1")
            {
                covariates["Total Parenteral/IV Feeding or Tube Feeding: While a Resident - Admission"] = 1;
            }

            return covariates;
        }

        private static Dictionary<string, int> MergeCovariates(Dictionary<string, int> dict1, Dictionary<string, int> dict2) 
        {
            List<Dictionary<string, int>> dictList = new List<Dictionary<string, int>> { dict1, dict2};
            return dictList.SelectMany(dict => dict).ToDictionary();
        }

        private static DateTime UnixToDateTime(string unix)
        {
            long unixSeconds = (long)Convert.ToDouble(unix);
            DateTime dateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
            dateTime = dateTime.AddSeconds(unixSeconds).ToLocalTime();
            return dateTime;
        }

        public static FunctionCovariatesReturn GetFunctionCovariates(Dictionary<string, string> parsedValues, int age, List<string> icdList, Dictionary<string, string> startScores, string? ardDate, Dictionary<string, int>? manualOverrides = null)
        {
            // Get the correct version of function multipliers based on ARD date
            // Parse A2300 - it may be in YYYYMMDD format or Unix timestamp
            string ardDateStr = String.IsNullOrEmpty(ardDate) ? parsedValues.GetValueOrDefault("A2300") : ardDate;
            Dictionary<string, double?> functionMultipliers = CoefficientLoader.GetFunctionMultipliers(ardDateStr);
            
            Dictionary<string, int> covariates = new Dictionary<string, int>();

            // 1. Intercept and Entry terms
            covariates["Model Intercept"] = 1;
            // covariates["Entry"] = 1;

            // 2. Admission Function score + squared
            double startScore = CalculateFunctionScore(startScores);
            covariates["Admission Function - Continuous Form"] = (int)Math.Round(startScore);
            covariates["Admission Function - Squared Form"] = (int)Math.Round(Math.Pow(startScore, 2));

            // 3. Age group logic
            string ageCov = ProcessAgeCovariate(parsedValues, age) ?? "";
            if (!String.IsNullOrEmpty(ageCov)) 
            {
                covariates[ageCov] = 1;
            }

            // 4-9. Use extracted processing functions
            covariates = MergeCovariates(covariates, ProcessContinenceCovariates(parsedValues));
            covariates = MergeCovariates(covariates, ProcessBMICovariates(parsedValues));
            covariates = MergeCovariates(covariates, ProcessCognitiveFunction(parsedValues));
            covariates = MergeCovariates(covariates, ProcessCommunicationImpairment(parsedValues));
            covariates = MergeCovariates(covariates, ProcessUsesWheelchair(parsedValues));

            // 10-16. Use extracted processing functions
            covariates = MergeCovariates(covariates, ProcessAdditionalClinicalConditions(parsedValues));
            covariates = MergeCovariates(covariates, ProcessMedicalConditionCategory(parsedValues, (int)Math.Round(startScore)));
            covariates = MergeCovariates(covariates, ProcessPriorFunctioning(parsedValues));
            covariates = MergeCovariates(covariates, ProcessPriorMobilityDevices(parsedValues));

            // 17-21. Additional clinical conditions (already handled by processAdditionalClinicalConditions)

            // 22-42. HCC conditions processing
            covariates = MergeCovariates(covariates, ProcessHCCConditions(parsedValues, icdList));

            // All HCC conditions are now handled by processHccConditions()

            // Apply manual overrides (for covariates that can't be determined from data)
            if (manualOverrides != null) {
                foreach (KeyValuePair<string, int> entry in manualOverrides) 
                {
                    if (entry.Value != null) 
                    {
                        covariates[entry.Key] = entry.Value;
                    }
                }
            }

            // Total weighted score based on covariates
            double weightedScore = 0;
            foreach (KeyValuePair<string, int> entry in covariates) {
                double multiplier = functionMultipliers.GetValueOrDefault(entry.Key) ?? 0;
                weightedScore += entry.Value * multiplier;
            }

            return new FunctionCovariatesReturn { Covariates = covariates, WeightedScore = weightedScore };
        }

        public string FormatDate(DateTime date)
        {
            return date.ToString("M/d/yyyy");
        }

        public int CalculateDateGap(DateTime date1, DateTime date2)
        {
            return (int)Math.Round((date2 - date1).TotalDays);
        }

        public PatientSummary ExtractPatientSummary(Dictionary<string, string> parsedValues, DateTime ardDate)
        {
            string firstName = parsedValues.GetValueOrDefault("A0500A");
            string lastName = parsedValues.GetValueOrDefault("A0500C");
            string facility = parsedValues.GetValueOrDefault("A0100B");

            string dobString = parsedValues.GetValueOrDefault("A0900");
            string dischargeDateString = parsedValues.GetValueOrDefault("A2000");

            DateTime dob;
            DateTime admitDate;
            DateTime dischargeDate;

            DateTime.TryParse(dobString, out dob);

            // Use fallback chain: A2400B (Medicare start) → A1600 (Entry date) → A1900 (Admission date)
            // Skip values that are blank, undefined, or "^" (skip pattern)
            if (!String.IsNullOrEmpty(parsedValues.GetValueOrDefault("A2400B")) && parsedValues.GetValueOrDefault("A2400B") != "^")
            {
                DateTime.TryParse(parsedValues.GetValueOrDefault("A2400B"), out admitDate);
            }
            else
            {
                if (!String.IsNullOrEmpty(parsedValues.GetValueOrDefault("A1600")) && parsedValues.GetValueOrDefault("A1600") != "^")
                {
                    DateTime.TryParse(parsedValues.GetValueOrDefault("A1600"), out admitDate);
                }
                else
                {
                    DateTime.TryParse(parsedValues.GetValueOrDefault("A1900"), out admitDate);
                }
            }

            DateTime.TryParse(dischargeDateString, out dischargeDate);

            int age = CalculateAgeAtAdmission(dob, admitDate);
            int ardGapDays = CalculateDateGap(admitDate, ardDate);

            return new PatientSummary
            {
                FirstName = firstName,
                LastName = lastName,
                Facility = facility,
                DOB = ((DateTimeOffset)dob).ToUnixTimeSeconds().ToString(),
                AdmitDate = ((DateTimeOffset)admitDate).ToUnixTimeSeconds().ToString(),
                DischargeDate = ((DateTimeOffset)dischargeDate).ToUnixTimeSeconds().ToString(),
                Age = age,
                ArdGapDays = ardGapDays
            };
        }
    }

    public class FunctionCovariatesReturn
    {
        public Dictionary<string, int> Covariates { get; set; }
        public double WeightedScore { get; set; }
    }
}