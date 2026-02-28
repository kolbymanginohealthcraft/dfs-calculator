using Aegis.DfsCalculator.Server.Data;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace Aegis.DfsCalculator.Server.Utils
{
    public class ServerImputations
    {
        static List<string> ANA = new List<string> { "07", "09", "10", "88" };
        static List<string> VALID = new List<string> { "01", "02", "03", "04", "05", "06" };
        static List<string> WALKER_ITEMS = new List<string> { "GG0170I1", "GG0170J1", "GG0170K1", "GG0170L1", "GG0170M1", "GG0170N1", "GG0170O1" };
        static List<string> WHEELCHAIR_ITEMS = new List<string> { "GG0170R1", "GG0170S1" };
        // Set to true for full CMS spec (I1 and I3 both ANA). Set to false for in-progress patients where discharge (I3) is not yet known.
        static bool REQUIRE_DISCHARGE_I3_FOR_WHEELCHAIR = false;
        static HashSet<string> ITEMS_WITH_SKIPPED_COVARIATE = new HashSet<string> { "GG0170J1", "GG0170K1", "GG0170L1", "GG0170N1", "GG0170O1", "GG0170R1", "GG0170S1" };

        /// <summary>
        /// Standard normal CDF Φ(x) using the Abramowitz &amp; Stegun rational approximation.
        /// </summary>
        /// A&S 7.1.26 approximates erf(u), so convert: Φ(x) = 0.5(1 + erf(x/√2))
        private static double NormalCDF(double x)
        {
            const double a1 =  0.254829592;
            const double a2 = -0.284496736;
            const double a3 =  1.421413741;
            const double a4 = -1.453152027;
            const double a5 =  1.061405429;
            const double p  =  0.3275911;

            double sign = x < 0 ? -1.0 : 1.0;
            double u = Math.Abs(x) / Math.Sqrt(2.0);
            double t = 1.0 / (1.0 + p * u);
            double y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.Exp(-u * u);

            return 0.5 * (1.0 + sign * y);
        }

        /// <summary>
        /// CMS statistical imputation: converts a z-score and thresholds (alphas) into a
        /// continuous expected value using standard normal CDF probabilities.
        /// Imputed value = 1·P₁ + 2·P₂ + 3·P₃ + 4·P₄ + 5·P₅ + 6·P₆
        /// </summary>
        private static double ComputeImputedValueFromScore(double z, List<double> thresholds)
        {
            double[] probs = new double[thresholds.Count + 1];
            probs[0] = NormalCDF(thresholds[0] - z);
            for (int i = 1; i < thresholds.Count; i++)
            {
                probs[i] = NormalCDF(thresholds[i] - z) - NormalCDF(thresholds[i - 1] - z);
            }
            probs[thresholds.Count] = 1.0 - NormalCDF(thresholds[thresholds.Count - 1] - z);

            double imputedValue = 0;
            for (int i = 0; i <= thresholds.Count; i++)
            {
                imputedValue += (i + 1) * probs[i];
            }
            return imputedValue;
        }

        private static readonly HashSet<string> SKIP_CASCADE_WALK_DOWNSTREAM = new HashSet<string> { "GG0170J1", "GG0170K1", "GG0170L1" };
        private static readonly HashSet<string> SKIP_CASCADE_STEP_M_DOWNSTREAM = new HashSet<string> { "GG0170N1", "GG0170O1" };

        /// <summary>
        /// Applies MDS skip cascade rules to determine the effective value of a GG item.
        /// Hard override: if the gate item is ANA, downstream items are forced to "^" (skipped).
        ///
        /// Walking:  I1 ANA → J1, K1, L1 become "^"
        /// Steps:    M1 ANA → N1, O1 become "^"
        ///           N1 ANA → O1 becomes "^"
        /// </summary>
        private static string? GetEffectiveGGValue(string ggItemId, Dictionary<string, string> parsedValues)
        {
            if (SKIP_CASCADE_WALK_DOWNSTREAM.Contains(ggItemId))
            {
                string? i1Value = parsedValues.GetValueOrDefault("GG0170I1");
                if (i1Value != null && ANA.Contains(i1Value)) return "^";
            }

            if (SKIP_CASCADE_STEP_M_DOWNSTREAM.Contains(ggItemId))
            {
                string? m1Value = parsedValues.GetValueOrDefault("GG0170M1");
                if (m1Value != null && ANA.Contains(m1Value)) return "^";
            }

            if (ggItemId == "GG0170O1")
            {
                string? n1Value = parsedValues.GetValueOrDefault("GG0170N1");
                if (n1Value != null && ANA.Contains(n1Value)) return "^";
            }

            return parsedValues.GetValueOrDefault(ggItemId);
        }

        private static string DetermineMobilityType(Dictionary<string, string> parsedValues)
        {
            // Wheelchair: I1 ANA (and I3 ANA when REQUIRE_DISCHARGE_I3_FOR_WHEELCHAIR). Valid R or S. Remaining = Walk.
            string i1 = parsedValues.GetValueOrDefault("GG0170I1");
            string i3 = parsedValues.GetValueOrDefault("GG0170I3");
            string r1 = parsedValues.GetValueOrDefault("GG0170R1");
            string r3 = parsedValues.GetValueOrDefault("GG0170R3");
            string s1 = parsedValues.GetValueOrDefault("GG0170S1");
            string s3 = parsedValues.GetValueOrDefault("GG0170S3");

            bool i1AndI3Ana = REQUIRE_DISCHARGE_I3_FOR_WHEELCHAIR
                ? (ANA.Any(i => i == i1) && ANA.Any(i => i == i3))
                : ANA.Any(i => i == i1);
            bool hasValidWheelchair = VALID.Any(i => i == r1) || VALID.Any(i => i == r3) || VALID.Any(i => i == s1) || VALID.Any(i => i == s3);

            return i1AndI3Ana && hasValidWheelchair ? "Wheel" : "Walk";
        }

        private static double GetGGItemSpecificCovariate(string covariateName, Dictionary<string, string> parsedValues, Dictionary<string, double?>? itemMultipliers = null) 
        {
            if (covariateName.Contains(" - Valid Score") || 
                covariateName.Contains(" - Not Attempted") || 
                covariateName.Contains(" - Skipped")) {
                Match match = Regex.Match(covariateName, @"\(GG[0-9]+[A-Z][0-9]\)");
                if (match.Success && match.Length > 0) 
                {
                    string ggItemId = match.Value.Substring(1, match.Length - 2);
                    string rawValue = GetEffectiveGGValue(ggItemId, parsedValues);

                    if (covariateName.Contains(" - Valid Score")) 
                    {
                        if(rawValue != null && VALID.Contains(rawValue)) 
                        {
                            return Int32.Parse(rawValue);
                        }
                    }
                    else if (covariateName.Contains(" - Not Attempted"))
                    {
                        if (ITEMS_WITH_SKIPPED_COVARIATE.Contains(ggItemId))
                        {
                            return ANA.Contains(rawValue) ? 1 : 0;
                        }
                        else
                        {
                            return (ANA.Contains(rawValue) || rawValue == "^") ? 1 : 0;
                        }
                    }
                    else if (covariateName.Contains(" - Skipped"))
                    {
                        // Skipped: return 1 if value is ^ (skip pattern), else 0
                        // Note: This covariate only exists for certain items (J1, K1, L1, N1, O1, R1, S1)
                        if (rawValue == "^")
                        {
                            return 1;
                        }
                        else
                        {
                            return 0;
                        }
                    }
                }
            }

            return -1;
        }

        private static double GetCovariateValue(string covariateName, Dictionary<string, string> parsedValues, int age, List<string> icdList, Dictionary<string, string> startScores, DateTime ardDate, Dictionary<string, double?>? itemMultipliers = null, Dictionary<string, double>? cachedCovariates = null)
        {
            double ggItemSpecificValue = GetGGItemSpecificCovariate(covariateName, parsedValues, itemMultipliers);
            if (ggItemSpecificValue != -1)
            {
                return ggItemSpecificValue;
            }

            // Use cached covariates if provided (performance optimization)
            if (cachedCovariates != null)
            {
                return cachedCovariates.GetValueOrDefault(covariateName);
            }

            // Fallback: calculate if cache not provided (shouldn't happen in GetImputationAnalysisData)
            FunctionCovariatesReturn result = ServerCalculations.GetFunctionCovariates(parsedValues, age, icdList, startScores, parsedValues.GetValueOrDefault("A2300"));
            if (result?.Covariates != null)
            {
                return result.Covariates.GetValueOrDefault(covariateName);
            }
            return 0;
        }

        public static bool ShouldExcludeGGItemCovariate(string covariateName, string itemBeingImputed, bool usesWheelchair)
        {
            // Extract GG item ID from covariate name (e.g., "Walk 10 Feet (GG0170I1) - Valid Score" -> "GG0170I1")
            Match match = Regex.Match(covariateName, @"\(GG[0-9]+[A-Z][0-9]\)");
            if (match.Success && match.Length > 0)
            {
                string ggItemId = match.Value.Substring(1, match.Length - 2);

                // Rule 1: Don't use an item in its own imputation
                if (ggItemId == itemBeingImputed)
                {
                    return true;
                }

                // Extract the letter from the GG item (e.g., "GG0170I1" -> "I")
                Match letterMatch = Regex.Match(ggItemId, @"GG[0-9]+([A-Z])[0-9]");
                if (!letterMatch.Success || letterMatch.Groups.Count < 2)
                {
                    return false;
                }
                char covariateItemLetter = letterMatch.Groups[1].Value[0];

                // Rule 2: If Uses Wheelchair, exclude Walk items (I, J, K, L)
                if (usesWheelchair && covariateItemLetter >= 'I' && covariateItemLetter <= 'L')
                {
                    return true;
                }

                // Rule 3: If Not Uses Wheelchair, exclude Wheelchair items (R, S)
                if (!usesWheelchair && covariateItemLetter >= 'R' && covariateItemLetter <= 'S')
                {
                    return true;
                }
            }
            return false;
        }

        public static double CalculateImputedValue(string ggItemId, Dictionary<string, string> parsedValues, int age, List<string> icdList, Dictionary<string, string> startScores)
        {
            string ardDateRaw = parsedValues.GetValueOrDefault("A2300");
            DateTime ardDate = CoefficientLoader.ParseArdDate(ardDateRaw) ?? DateTime.UtcNow;
            Dictionary<string, double?> multipliers = CoefficientLoader.GetImputationMultipliersForItem(ggItemId, ardDate);
            if (multipliers == null || multipliers.Keys.Count() == 0) return 1.0;

            // Get covariates to determine Uses Wheelchair value (cache for reuse)
            Dictionary<string, double> cachedCovariates = ServerCalculations.GetFunctionCovariates(parsedValues, age, icdList, startScores, ardDateRaw).Covariates;
            bool usesWheelchair = cachedCovariates.GetValueOrDefault("Uses Wheelchair") == 1;

            List<double> thresholds = GetImputationThresholds(ggItemId, ardDate);

            double imputationScore = 0;

            // Calculate imputation score using covariate * multiplier
            foreach (KeyValuePair<string, double?> entry in multipliers)
            {
                if (entry.Key.StartsWith("Model Threshold"))
                {
                    continue;
                }
                
                if (entry.Key.Contains("(GG") || entry.Key.Contains("Valid Score") || entry.Key.Contains("Not Attempted") || entry.Key.Contains("Skipped"))
                {
                    if (ShouldExcludeGGItemCovariate(entry.Key, ggItemId, usesWheelchair)) continue;
                }

                var covariateValue = GetCovariateValue(entry.Key, parsedValues, age, icdList, startScores, ardDate, multipliers, cachedCovariates);
                imputationScore += covariateValue * (entry.Value ?? 0);
            }

            return ComputeImputedValueFromScore(imputationScore, thresholds);
        }

        public static Dictionary<string, double> ImputeMissingGGItems(Dictionary<string, string> parsedValues, int age, List<string> icdList, Dictionary<string, string> startScores, Dictionary<string, string> targetGGItems)
        {
            string ardDateRaw = parsedValues.GetValueOrDefault("A2300");
            DateTime ardDate = CoefficientLoader.ParseArdDate(ardDateRaw) ?? DateTime.UtcNow;
            Dictionary<string, Dictionary<string, double?>> multipliers = CoefficientLoader.GetImputationMultipliers(ardDate);

            Dictionary<string, double> covariates = ServerCalculations.GetFunctionCovariates(parsedValues, age, icdList, startScores, ardDateRaw).Covariates;
            bool usesWheelchair = covariates.GetValueOrDefault("Uses Wheelchair") == 1;

            string mobilityType = DetermineMobilityType(parsedValues);

            Dictionary<string, double> imputedValues = new Dictionary<string, double>();

            foreach (KeyValuePair<string, Dictionary<string, double?>> entry in multipliers)
            {
                string ggItemId = entry.Key;

                if (WALKER_ITEMS.Contains(ggItemId) && mobilityType != "Walk") continue;
                if (WHEELCHAIR_ITEMS.Contains(ggItemId) && mobilityType != "Wheel") continue;

                string currentValue = targetGGItems[ggItemId];
                bool needsImputation = !VALID.Contains(currentValue);

                if (needsImputation)
                {
                    Dictionary<string, double?> itemMultipliers = entry.Value;
                    double imputationScore = 0;

                    foreach (KeyValuePair<string, double?> multiplierEntry in itemMultipliers)
                    {
                        if (multiplierEntry.Key.StartsWith("Model Threshold")) continue;
                        
                        double covariateValue = 0;

                        if (multiplierEntry.Key.Contains("(GG") || multiplierEntry.Key.Contains("Valid Score") || multiplierEntry.Key.Contains("Not Attempted") || multiplierEntry.Key.Contains("Skipped"))
                        {
                            if (ShouldExcludeGGItemCovariate(multiplierEntry.Key, ggItemId, usesWheelchair)) continue;

                            Match match = Regex.Match(multiplierEntry.Key, @"\(GG[0-9]+[A-Z][0-9]\)");
                            if (match.Success && match.Length > 0)
                            {
                                string itemId = match.Value.Substring(1, match.Length - 2);
                                string? rawValue = GetEffectiveGGValue(itemId, parsedValues);

                                if (multiplierEntry.Key.Contains("Valid Score"))
                                {
                                    if (rawValue != null && VALID.Contains(rawValue))
                                        covariateValue = Int32.Parse(rawValue);
                                }
                                else if (multiplierEntry.Key.Contains("Not Attempted"))
                                {
                                    if (ITEMS_WITH_SKIPPED_COVARIATE.Contains(itemId))
                                        covariateValue = ANA.Contains(rawValue) ? 1 : 0;
                                    else
                                        covariateValue = (ANA.Contains(rawValue) || rawValue == "^") ? 1 : 0;
                                }
                                else if (multiplierEntry.Key.Contains("Skipped"))
                                {
                                    covariateValue = rawValue == "^" ? 1 : 0;
                                }
                            }
                        }
                        else
                        {
                            string mappedCovariateName = CovariateMap.COVARIATE_MAP.GetValueOrDefault(multiplierEntry.Key) ?? multiplierEntry.Key;
                            covariates.TryGetValue(mappedCovariateName, out covariateValue);
                        }

                        imputationScore += covariateValue * (multiplierEntry.Value ?? 0);
                    }

                    List<double> thresholds = ExtractThresholds(itemMultipliers);
                    imputedValues[ggItemId] = ComputeImputedValueFromScore(imputationScore, thresholds);
                }
            }

            return imputedValues;
        }

        public static List<double> GetImputationThresholds(string ggItemId, DateTime ardDate)
        {
            Dictionary<string, Dictionary<string, double?>> multipliers = CoefficientLoader.GetImputationMultipliers(ardDate);
            if (multipliers.TryGetValue(ggItemId, out Dictionary<string, double?>? itemMultipliers) && itemMultipliers != null)
            {
                return ExtractThresholds(itemMultipliers);
            }

            return DEFAULT_THRESHOLDS;
        }

        private static readonly List<double> DEFAULT_THRESHOLDS = new List<double> { -0.5, 0.5, 1.5, 2.5, 3.5 };

        private static List<double> ExtractThresholds(Dictionary<string, double?> itemMultipliers)
        {
            List<double> thresholds = new List<double>
            {
                itemMultipliers.GetValueOrDefault("Model Threshold 1") ?? 0,
                itemMultipliers.GetValueOrDefault("Model Threshold 2") ?? 0,
                itemMultipliers.GetValueOrDefault("Model Threshold 3") ?? 0,
                itemMultipliers.GetValueOrDefault("Model Threshold 4") ?? 0,
                itemMultipliers.GetValueOrDefault("Model Threshold 5") ?? 0
            };

            return thresholds.All(t => t != 0) ? thresholds : DEFAULT_THRESHOLDS;
        }

        public static Dictionary<string, ImputationAnalysisData> GetImputationAnalysisData(Dictionary<string, string> parsedValues, int age, List<string> icdList, Dictionary<string, string> startScores)
        {
            Dictionary<string, ImputationAnalysisData> data = new Dictionary<string, ImputationAnalysisData> ();

            string ardDateRaw = parsedValues.GetValueOrDefault("A2300");
            DateTime ardDate = CoefficientLoader.ParseArdDate(ardDateRaw) ?? DateTime.UtcNow;
            Dictionary<string, Dictionary<string, double?>> imputationMultipliers = CoefficientLoader.GetImputationMultipliers(ardDate);

            // Get the standard covariates ONCE and cache them (expensive operation - don't repeat for each multiplier)
            Dictionary<string, double> cachedCovariates = ServerCalculations.GetFunctionCovariates(parsedValues, age, icdList, startScores, ardDateRaw).Covariates;
            // Determine if patient uses wheelchair (Uses Wheelchair covariate = 1 or 0)
            bool usesWheelchair = cachedCovariates.GetValueOrDefault("Uses Wheelchair") == 1;

            // Determine mobility type (same logic as ImputationTab)
            string mobilityType = DetermineMobilityType(parsedValues);

            foreach (KeyValuePair<string, Dictionary<string, double?>> entry in imputationMultipliers)
            {
                string ggItemId = entry.Key;
                // Filter items based on mobility type (same as ImputationTab)
                if (WALKER_ITEMS.Contains(ggItemId) && mobilityType != "Walk")
                {
                    continue;
                }
                if (WHEELCHAIR_ITEMS.Contains(ggItemId) && mobilityType != "Wheel")
                {
                    continue;
                }

                Dictionary<string, double?> multipliers = entry.Value;
                List<double> thresholds = GetImputationThresholds(ggItemId, ardDate);

                // Get covariates for this specific GG item (reused logic)
                Dictionary<string, double> itemCovariates = new Dictionary<string, double>();
                double imputationScore = 0;
                
                // Filter out threshold keys from multipliers for response (they're not covariates)
                Dictionary<string, double?> filteredMultipliers = new Dictionary<string, double?>();

                foreach (KeyValuePair<string, double?> multiplierEntry in multipliers)
                {
                    string covariateName = multiplierEntry.Key;
                    
                    // Skip threshold keys - they're not covariates
                    if (covariateName.StartsWith("Model Threshold"))
                    {
                        continue;
                    }
                    
                    // Add to filtered multipliers for response
                    filteredMultipliers[covariateName] = multiplierEntry.Value;
                    
                    if (covariateName.Contains("(GG") || covariateName.Contains("Valid Score") || covariateName.Contains("Not Attempted") || covariateName.Contains("Skipped"))
                    {
                        if (ShouldExcludeGGItemCovariate(covariateName, ggItemId, usesWheelchair))
                        {
                            continue;
                        }
                    }

                    double covariateValue = GetCovariateValue(covariateName, parsedValues, age, icdList, startScores, ardDate, multipliers, cachedCovariates);
                    if (covariateValue != 0)
                    {
                        itemCovariates[multiplierEntry.Key] = covariateValue;
                        imputationScore += covariateValue * (multiplierEntry.Value ?? 0);
                    }
                }

                // CMS statistical imputation: convert z-score to continuous expected value
                double imputedValue = ComputeImputedValueFromScore(imputationScore, thresholds);

                // Check raw MDS value to determine if imputation is needed
                string? rawValue = parsedValues.GetValueOrDefault(ggItemId);
                bool isValidValue = rawValue != null && VALID.Contains(rawValue);
                bool needsImputation = (rawValue == null) || !isValidValue;

                data[ggItemId] = new ImputationAnalysisData
                {
                    Covariates = itemCovariates,
                    Multipliers = filteredMultipliers,
                    ImputationScore = imputationScore,
                    Thresholds = thresholds,
                    ImputedValue = needsImputation ? imputedValue : null,
                    OriginalValue = rawValue,
                    NeedsImputation = needsImputation
                };
            }

            return data;
        }
    }

    public class ImputationAnalysisData
    {
        public Dictionary<string, double> Covariates { get; set; }
        public Dictionary<string, double?> Multipliers { get; set; }
        public double ImputationScore { get; set; }
        public List<double> Thresholds { get; set; }
        public double? ImputedValue { get; set; }
        public string? OriginalValue { get; set; }
        public bool NeedsImputation { get; set; }
    }
}