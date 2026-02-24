using Aegis.DfsCalculator.Server.Utils;
using Xunit;

namespace DFSCalculator.Server.Tests;

[Collection("DataDirectory")]
public class CalculationsTests
{
    /// <summary>
    /// Builds a minimal MDS parsed-values dictionary with the fields most commonly
    /// required by GetFunctionCovariates.  Individual tests override specific keys.
    /// </summary>
    private static Dictionary<string, string> BuildBaseParsedValues()
    {
        return new Dictionary<string, string>
        {
            // Demographics
            ["A0500A"] = "Jane",
            ["A0500C"] = "Doe",
            ["A0900"]  = "1950-06-15",   // DOB
            ["A1600"]  = "2025-01-10",   // Entry date
            ["A1900"]  = "2025-01-10",   // Admission date
            ["A2000"]  = "2025-02-10",   // Discharge date
            ["A2300"]  = "20250115",     // ARD date (FY 2025)
            ["A2400B"] = "2025-01-10",   // Medicare start
            ["A0100B"] = "123456",       // Facility CCN

            // Height / Weight for BMI (normal BMI ~25)
            ["K0200A"] = "66",  // height in inches
            ["K0200B"] = "155", // weight in pounds

            // BIMS (intact cognition = 13-15)
            ["C0500"]  = "15",
            ["C0900A"] = "0", ["C0900B"] = "0", ["C0900C"] = "0", ["C0900D"] = "0",
            ["C0900Z"] = "0",

            // Communication (no impairment)
            ["B0700"] = "0",
            ["B0800"] = "0",

            // Continence (continent)
            ["H0300"] = "0",
            ["H0400"] = "0",

            // Prior functioning (independent)
            ["GG0100A"] = "3",
            ["GG0100B"] = "3",
            ["GG0100C"] = "3",
            ["GG0100D"] = "3",

            // Prior mobility devices (none)
            ["GG0110A"] = "0", ["GG0110B"] = "0", ["GG0110C"] = "0",
            ["GG0110D"] = "0", ["GG0110E"] = "0",

            // Primary medical condition (Fracture = "09")
            ["I0020"] = "09",

            // Active diagnoses (none set)
            ["I0100"] = "0", ["I1500"] = "0", ["I2000"] = "0",
            ["I2100"] = "0", ["I2900"] = "0", ["I4800"] = "0",
            ["I4900"] = "0", ["I5000"] = "0", ["I5100"] = "0",
            ["I5200"] = "0", ["I5250"] = "0", ["I5300"] = "0",
            ["I5800"] = "0", ["I5900"] = "0", ["I5950"] = "0",
            ["I6000"] = "0",

            // Amputation / surgical fields
            ["GG0120D"]  = "0",
            ["O0500I"]   = "0",
            ["O0110J1A"] = "0", ["O0110J1B"] = "0",

            // Therapy minutes (has PT + OT on admission and discharge)
            ["O0400B1"] = "30", ["O0400B2"] = "30", ["O0400B3"] = "30",
            ["O0400C1"] = "30", ["O0400C2"] = "30", ["O0400C3"] = "30",
            ["O0425B1"] = "30", ["O0425B2"] = "30", ["O0425B3"] = "30",
            ["O0425C1"] = "30", ["O0425C2"] = "30", ["O0425C3"] = "30",

            // Pressure ulcers (none)
            ["M0300B1"] = "0", ["M0300C1"] = "0", ["M0300D1"] = "0",
            ["M0300E1"] = "0", ["M0300F1"] = "0", ["M0300G1"] = "0",

            // Falls (none)
            ["J1700A"] = "0", ["J1700B"] = "0", ["J1700C"] = "0",

            // Prior surgery (no)
            ["J2000"] = "0",

            // Nutritional approaches (none)
            ["K0520A3"] = "0", ["K0520B3"] = "0", ["K0520C3"] = "0",

            // GG scores for mobility type determination (Walk patient)
            ["GG0170I1"] = "03", ["GG0170I3"] = "04",
            ["GG0170R1"] = "03", ["GG0170R3"] = "03",
            ["GG0170S1"] = "03", ["GG0170S3"] = "03",
        };
    }

    /// <summary>
    /// Builds a dictionary of start scores (admission GG item values).
    /// </summary>
    private static Dictionary<string, string> BuildBaseStartScores()
    {
        return new Dictionary<string, string>
        {
            ["GG0130A"] = "03",
            ["GG0130B"] = "04",
            ["GG0130C"] = "03",
            ["GG0170A"] = "03",
            ["GG0170C"] = "03",
            ["GG0170D"] = "03",
            ["GG0170E"] = "03",
            ["GG0170F"] = "03",
            ["GG0170I"] = "03",
            ["GG0170J"] = "03",
            ["GG0170R"] = "03",
        };
    }

    // -----------------------------------------------------------------------
    // GetFunctionCovariates - basic smoke test
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_ReturnsNonNullResult()
    {
        var parsed = BuildBaseParsedValues();
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.NotNull(result);
        Assert.NotNull(result.Covariates);
        Assert.NotEqual(0, result.WeightedScore);
    }

    [Fact]
    public void GetFunctionCovariates_AlwaysContainsInterceptAndAdmissionScore()
    {
        var parsed = BuildBaseParsedValues();
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey("Model Intercept"));
        Assert.Equal(1, result.Covariates["Model Intercept"]);

        Assert.True(result.Covariates.ContainsKey("Admission Function - Continuous Form"));
        Assert.True(result.Covariates.ContainsKey("Admission Function - Squared Form"));
    }

    // -----------------------------------------------------------------------
    // Age covariate processing
    // -----------------------------------------------------------------------
    [Theory]
    [InlineData(50, "≤54 Years")]
    [InlineData(60, "55-64 Years")]
    [InlineData(70, "65-74 Years")]
    [InlineData(80, "75-84 Years")]
    [InlineData(88, "85-90 Years")]
    [InlineData(95, ">90 Years")]
    public void GetFunctionCovariates_SetsCorrectAgeBucket(int age, string expectedKey)
    {
        var parsed = BuildBaseParsedValues();
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey(expectedKey),
            $"Expected covariate '{expectedKey}' for age {age}");
    }

    // -----------------------------------------------------------------------
    // BMI covariates
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_DetectsHighBMI()
    {
        var parsed = BuildBaseParsedValues();
        // BMI = (400 * 703) / (66^2) ≈ 64.5 → High BMI
        parsed["K0200B"] = "400";
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey("High BMI"));
    }

    [Fact]
    public void GetFunctionCovariates_DetectsLowBMI()
    {
        var parsed = BuildBaseParsedValues();
        // BMI = (95 * 703) / (66^2) ≈ 15.3 → Low BMI
        parsed["K0200B"] = "95";
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey("Low BMI"));
    }

    // -----------------------------------------------------------------------
    // Cognitive function covariates
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_DetectsModeratelyImpairedCognition()
    {
        var parsed = BuildBaseParsedValues();
        parsed["C0500"] = "10"; // BIMS 8-12 = moderately impaired
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey(
            "Cognitive Function, BIMS Score: Moderately Impaired - Admission"));
    }

    [Fact]
    public void GetFunctionCovariates_DetectsSeverelyImpairedCognition()
    {
        var parsed = BuildBaseParsedValues();
        parsed["C0500"] = "05"; // BIMS 0-7 = severely impaired
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey(
            "Cognitive Function, BIMS Score: Severely Impaired - Admission"));
    }

    // -----------------------------------------------------------------------
    // Wheelchair mobility detection
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_DetectsWheelchairUser()
    {
        var parsed = BuildBaseParsedValues();
        // Make I1/I3 ANA so mobility type = Wheel
        parsed["GG0170I1"] = "07";
        parsed["GG0170I3"] = "09";
        parsed["GG0170R1"] = "03";
        parsed["GG0170S1"] = "03";
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey("Uses Wheelchair"));
    }

    // -----------------------------------------------------------------------
    // Communication impairment
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_DetectsModerateCommunicationImpairment()
    {
        var parsed = BuildBaseParsedValues();
        parsed["B0700"] = "2"; // Moderate
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey(
            "Communication Impairment: Moderate to Severe - Admission"));
    }

    [Fact]
    public void GetFunctionCovariates_DetectsMildCommunicationImpairment()
    {
        var parsed = BuildBaseParsedValues();
        parsed["B0700"] = "1";
        parsed["B0800"] = "0";
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey(
            "Communication Impairment: Mild - Admission"));
    }

    // -----------------------------------------------------------------------
    // Primary Medical Condition Category and interaction term
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_SetsMedicalConditionAndInteraction()
    {
        var parsed = BuildBaseParsedValues();
        parsed["I0020"] = "09"; // Fractures and Other Multiple Trauma
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        var conditionKey = result.Covariates.Keys
            .FirstOrDefault(k => k.StartsWith("Primary Medical Condition Category:"));
        Assert.NotNull(conditionKey);
        Assert.Equal(1, result.Covariates[conditionKey]);

        var interactionKey = result.Covariates.Keys
            .FirstOrDefault(k => k.StartsWith("Interaction of Admission Function Score and"));
        Assert.NotNull(interactionKey);
        Assert.True(result.Covariates[interactionKey] > 0);
    }

    // -----------------------------------------------------------------------
    // Continence covariates
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_DetectsBowelIncontinence()
    {
        var parsed = BuildBaseParsedValues();
        parsed["H0400"] = "3"; // Always incontinent
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey(
            "Bowel Continence: Always Incontinent - Admission"));
    }

    // -----------------------------------------------------------------------
    // Prior functioning
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_DetectsPriorFunctioningDependent()
    {
        var parsed = BuildBaseParsedValues();
        parsed["GG0100A"] = "1"; // Self-Care: Dependent
        parsed["GG0100B"] = "1"; // Indoor Mobility: Dependent
        var startScores = BuildBaseStartScores();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, age: 74, icdList: new List<string>(),
            startScores, ardDate: "20250115");

        Assert.True(result.Covariates.ContainsKey("Prior Functioning, Self-Care: Dependent"));
        Assert.True(result.Covariates.ContainsKey(
            "Prior Functioning, Indoor Mobility (Ambulation): Dependent"));
    }

    // -----------------------------------------------------------------------
    // WeightedScore is deterministic for the same inputs
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_WeightedScoreIsDeterministic()
    {
        var parsed = BuildBaseParsedValues();
        var startScores = BuildBaseStartScores();

        var r1 = ServerCalculations.GetFunctionCovariates(
            parsed, 74, new List<string>(), startScores, "20250115");
        var r2 = ServerCalculations.GetFunctionCovariates(
            parsed, 74, new List<string>(), startScores, "20250115");

        Assert.Equal(r1.WeightedScore, r2.WeightedScore);
    }

    // -----------------------------------------------------------------------
    // Admission Function Score calculation
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionCovariates_AdmissionScoreMatchesManualCalculation()
    {
        var startScores = BuildBaseStartScores();
        // Walk: 3+4+3 + 3+3+3+3+3 + 3+3 = 31
        var parsed = BuildBaseParsedValues();

        var result = ServerCalculations.GetFunctionCovariates(
            parsed, 74, new List<string>(), startScores, "20250115");

        Assert.Equal(31, result.Covariates["Admission Function - Continuous Form"]);
        Assert.Equal(31 * 31, result.Covariates["Admission Function - Squared Form"]);
    }
}
