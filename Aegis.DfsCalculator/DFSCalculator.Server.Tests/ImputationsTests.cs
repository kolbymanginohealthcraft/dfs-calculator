using Aegis.DfsCalculator.Server.Utils;
using Xunit;

namespace DFSCalculator.Server.Tests;

[Collection("DataDirectory")]
public class ImputationsTests
{
    // -----------------------------------------------------------------------
    // ShouldExcludeGGItemCovariate — pure logic, no data dependencies
    // -----------------------------------------------------------------------
    [Fact]
    public void ShouldExclude_WhenCovariateRefersToSameItemBeingImputed()
    {
        bool result = ServerImputations.ShouldExcludeGGItemCovariate(
            "Walk 10 Feet (GG0170I1) - Valid Score", "GG0170I1", usesWheelchair: false);
        Assert.True(result);
    }

    [Fact]
    public void ShouldNotExclude_WhenCovariateRefersToDifferentItem()
    {
        bool result = ServerImputations.ShouldExcludeGGItemCovariate(
            "Walk 10 Feet (GG0170I1) - Valid Score", "GG0170J1", usesWheelchair: false);
        Assert.False(result);
    }

    [Fact]
    public void ShouldExclude_WalkItemsWhenUsesWheelchair()
    {
        // Walk items are I, J, K, L — should be excluded for wheelchair users
        Assert.True(ServerImputations.ShouldExcludeGGItemCovariate(
            "Walk 10 Feet (GG0170I1) - Valid Score", "GG0130A1", usesWheelchair: true));
        Assert.True(ServerImputations.ShouldExcludeGGItemCovariate(
            "Walk 50 Feet With 2 Turns (GG0170J1) - Valid Score", "GG0130A1", usesWheelchair: true));
        Assert.True(ServerImputations.ShouldExcludeGGItemCovariate(
            "Walk 150 Feet (GG0170K1) - Valid Score", "GG0130A1", usesWheelchair: true));
        Assert.True(ServerImputations.ShouldExcludeGGItemCovariate(
            "Walk 10 Feet Uneven Surface (GG0170L1) - Valid Score", "GG0130A1", usesWheelchair: true));
    }

    [Fact]
    public void ShouldNotExclude_WalkItemsWhenDoesNotUseWheelchair()
    {
        Assert.False(ServerImputations.ShouldExcludeGGItemCovariate(
            "Walk 10 Feet (GG0170I1) - Valid Score", "GG0130A1", usesWheelchair: false));
    }

    [Fact]
    public void ShouldExclude_WheelchairItemsWhenDoesNotUseWheelchair()
    {
        // R, S items should be excluded when not a wheelchair user
        Assert.True(ServerImputations.ShouldExcludeGGItemCovariate(
            "Wheel 50 Feet With 2 Turns (GG0170R1) - Valid Score", "GG0130A1", usesWheelchair: false));
        Assert.True(ServerImputations.ShouldExcludeGGItemCovariate(
            "Wheel 150 Feet (GG0170S1) - Valid Score", "GG0130A1", usesWheelchair: false));
    }

    [Fact]
    public void ShouldNotExclude_WheelchairItemsWhenUsesWheelchair()
    {
        Assert.False(ServerImputations.ShouldExcludeGGItemCovariate(
            "Wheel 50 Feet With 2 Turns (GG0170R1) - Valid Score", "GG0130A1", usesWheelchair: true));
    }

    [Fact]
    public void ShouldNotExclude_CovariateWithoutGGReference()
    {
        Assert.False(ServerImputations.ShouldExcludeGGItemCovariate(
            "High BMI", "GG0130A1", usesWheelchair: false));
    }

    // -----------------------------------------------------------------------
    // GetImputationThresholds
    // -----------------------------------------------------------------------
    [Fact]
    public void GetImputationThresholds_ReturnsFiveThresholds()
    {
        var ardDate = new DateTime(2025, 1, 15);
        var thresholds = ServerImputations.GetImputationThresholds("GG0130A1", ardDate);

        Assert.Equal(5, thresholds.Count);
    }

    [Fact]
    public void GetImputationThresholds_ThresholdsAreMonotonicallyIncreasing()
    {
        var ardDate = new DateTime(2025, 1, 15);
        var thresholds = ServerImputations.GetImputationThresholds("GG0130A1", ardDate);

        for (int i = 1; i < thresholds.Count; i++)
        {
            Assert.True(thresholds[i] > thresholds[i - 1],
                $"Threshold {i} ({thresholds[i]}) should be > threshold {i - 1} ({thresholds[i - 1]})");
        }
    }

    [Fact]
    public void GetImputationThresholds_ReturnsDefaults_ForUnknownItem()
    {
        var ardDate = new DateTime(2025, 1, 15);
        var thresholds = ServerImputations.GetImputationThresholds("GG9999Z9", ardDate);

        Assert.Equal(new List<double> { -0.5, 0.5, 1.5, 2.5, 3.5 }, thresholds);
    }

    // -----------------------------------------------------------------------
    // CalculateImputedValue — integration test with real coefficients
    // -----------------------------------------------------------------------
    [Fact]
    public void CalculateImputedValue_ReturnsValueBetween1And6()
    {
        var parsed = BuildBaseParsedValues();
        // Set the item being imputed to an ANA code so it actually needs imputation
        parsed["GG0130A1"] = "88";
        var startScores = BuildBaseStartScores();

        double imputed = ServerImputations.CalculateImputedValue(
            "GG0130A1", parsed, age: 74, new List<string>(), startScores);

        Assert.InRange(imputed, 1.0, 6.0);
    }

    [Fact]
    public void CalculateImputedValue_IsDeterministic()
    {
        var parsed = BuildBaseParsedValues();
        parsed["GG0130A1"] = "88";
        var startScores = BuildBaseStartScores();

        double v1 = ServerImputations.CalculateImputedValue(
            "GG0130A1", parsed, 74, new List<string>(), startScores);
        double v2 = ServerImputations.CalculateImputedValue(
            "GG0130A1", parsed, 74, new List<string>(), startScores);

        Assert.Equal(v1, v2);
    }

    // -----------------------------------------------------------------------
    // ImputeMissingGGItems — batch imputation
    // -----------------------------------------------------------------------
    [Fact]
    public void ImputeMissingGGItems_OnlyImputesInvalidValues()
    {
        var parsed = BuildBaseParsedValues();
        var startScores = BuildBaseStartScores();

        var targetGGItems = new Dictionary<string, string>
        {
            ["GG0130A1"] = "03", // Valid — should NOT be imputed
            ["GG0130B1"] = "88", // ANA — should be imputed
            ["GG0130C1"] = "04", // Valid — should NOT be imputed
            ["GG0130E1"] = "03",
            ["GG0130F1"] = "03",
            ["GG0130G1"] = "03",
            ["GG0130H1"] = "03",
            ["GG0170A1"] = "03",
            ["GG0170B1"] = "03",
            ["GG0170C1"] = "03",
            ["GG0170D1"] = "03",
            ["GG0170E1"] = "03",
            ["GG0170F1"] = "03",
            ["GG0170G1"] = "03",
            ["GG0170I1"] = "03",
            ["GG0170J1"] = "03",
            ["GG0170K1"] = "03",
            ["GG0170L1"] = "03",
            ["GG0170M1"] = "03",
            ["GG0170N1"] = "03",
            ["GG0170O1"] = "03",
            ["GG0170P1"] = "03",
            ["GG0170R1"] = "03",
            ["GG0170S1"] = "03",
        };

        var imputed = ServerImputations.ImputeMissingGGItems(
            parsed, 74, new List<string>(), startScores, targetGGItems);

        Assert.False(imputed.ContainsKey("GG0130A1"), "Valid item should not be imputed");
        Assert.True(imputed.ContainsKey("GG0130B1"), "ANA item should be imputed");
        Assert.InRange(imputed["GG0130B1"], 1.0, 6.0);
    }

    // -----------------------------------------------------------------------
    // GetImputationAnalysisData — returns analysis for all relevant GG items
    // -----------------------------------------------------------------------
    [Fact]
    public void GetImputationAnalysisData_ReturnsDataForGGItems()
    {
        var parsed = BuildBaseParsedValues();
        var startScores = BuildBaseStartScores();

        var analysis = ServerImputations.GetImputationAnalysisData(
            parsed, 74, new List<string>(), startScores);

        Assert.NotNull(analysis);
        Assert.True(analysis.Count > 0, "Should return analysis for at least one GG item");

        foreach (var entry in analysis)
        {
            Assert.True(entry.Key.StartsWith("GG"), $"Key should be a GG item ID: {entry.Key}");
            Assert.NotNull(entry.Value.Multipliers);
            Assert.Equal(5, entry.Value.Thresholds.Count);
        }
    }

    [Fact]
    public void GetImputationAnalysisData_IdentifiesItemsNeedingImputation()
    {
        var parsed = BuildBaseParsedValues();
        parsed["GG0130A1"] = "88"; // ANA — needs imputation
        var startScores = BuildBaseStartScores();

        var analysis = ServerImputations.GetImputationAnalysisData(
            parsed, 74, new List<string>(), startScores);

        if (analysis.ContainsKey("GG0130A1"))
        {
            Assert.True(analysis["GG0130A1"].NeedsImputation);
            Assert.NotNull(analysis["GG0130A1"].ImputedValue);
            Assert.InRange(analysis["GG0130A1"].ImputedValue!.Value, 1.0, 6.0);
        }
    }

    [Fact]
    public void GetImputationAnalysisData_ValidItemDoesNotNeedImputation()
    {
        var parsed = BuildBaseParsedValues();
        parsed["GG0130A1"] = "03"; // Valid score
        var startScores = BuildBaseStartScores();

        var analysis = ServerImputations.GetImputationAnalysisData(
            parsed, 74, new List<string>(), startScores);

        if (analysis.ContainsKey("GG0130A1"))
        {
            Assert.False(analysis["GG0130A1"].NeedsImputation);
            Assert.Null(analysis["GG0130A1"].ImputedValue);
        }
    }

    // -----------------------------------------------------------------------
    // Helper: same base data as CalculationsTests
    // -----------------------------------------------------------------------
    private static Dictionary<string, string> BuildBaseParsedValues()
    {
        return new Dictionary<string, string>
        {
            ["A0500A"] = "Jane", ["A0500C"] = "Doe",
            ["A0900"] = "1950-06-15", ["A1600"] = "2025-01-10",
            ["A1900"] = "2025-01-10", ["A2000"] = "2025-02-10",
            ["A2300"] = "20250115", ["A2400B"] = "2025-01-10",
            ["A0100B"] = "123456",
            ["K0200A"] = "66", ["K0200B"] = "155",
            ["C0500"] = "15",
            ["C0900A"] = "0", ["C0900B"] = "0", ["C0900C"] = "0", ["C0900D"] = "0", ["C0900Z"] = "0",
            ["B0700"] = "0", ["B0800"] = "0",
            ["H0300"] = "0", ["H0400"] = "0",
            ["GG0100A"] = "3", ["GG0100B"] = "3", ["GG0100C"] = "3", ["GG0100D"] = "3",
            ["GG0110A"] = "0", ["GG0110B"] = "0", ["GG0110C"] = "0",
            ["GG0110D"] = "0", ["GG0110E"] = "0",
            ["I0020"] = "09",
            ["I0100"] = "0", ["I1500"] = "0", ["I2000"] = "0",
            ["I2100"] = "0", ["I2900"] = "0", ["I4800"] = "0",
            ["I4900"] = "0", ["I5000"] = "0", ["I5100"] = "0",
            ["I5200"] = "0", ["I5250"] = "0", ["I5300"] = "0",
            ["I5800"] = "0", ["I5900"] = "0", ["I5950"] = "0", ["I6000"] = "0",
            ["GG0120D"] = "0", ["O0500I"] = "0",
            ["O0110J1A"] = "0", ["O0110J1B"] = "0",
            ["O0400B1"] = "30", ["O0400B2"] = "30", ["O0400B3"] = "30",
            ["O0400C1"] = "30", ["O0400C2"] = "30", ["O0400C3"] = "30",
            ["O0425B1"] = "30", ["O0425B2"] = "30", ["O0425B3"] = "30",
            ["O0425C1"] = "30", ["O0425C2"] = "30", ["O0425C3"] = "30",
            ["M0300B1"] = "0", ["M0300C1"] = "0", ["M0300D1"] = "0",
            ["M0300E1"] = "0", ["M0300F1"] = "0", ["M0300G1"] = "0",
            ["J1700A"] = "0", ["J1700B"] = "0", ["J1700C"] = "0",
            ["J2000"] = "0",
            ["K0520A3"] = "0", ["K0520B3"] = "0", ["K0520C3"] = "0",
            // Walk patient GG mobility values
            ["GG0170I1"] = "03", ["GG0170I3"] = "04",
            ["GG0170R1"] = "03", ["GG0170R3"] = "03",
            ["GG0170S1"] = "03", ["GG0170S3"] = "03",
            // All GG items with valid values by default
            ["GG0130A1"] = "03", ["GG0130B1"] = "04", ["GG0130C1"] = "03",
            ["GG0130E1"] = "03", ["GG0130F1"] = "03", ["GG0130G1"] = "03", ["GG0130H1"] = "03",
            ["GG0170A1"] = "03", ["GG0170B1"] = "03", ["GG0170C1"] = "03",
            ["GG0170D1"] = "03", ["GG0170E1"] = "03", ["GG0170F1"] = "03",
            ["GG0170G1"] = "03",
            ["GG0170J1"] = "03", ["GG0170K1"] = "03", ["GG0170L1"] = "03",
            ["GG0170M1"] = "03", ["GG0170N1"] = "03", ["GG0170O1"] = "03",
            ["GG0170P1"] = "03",
        };
    }

    private static Dictionary<string, string> BuildBaseStartScores()
    {
        return new Dictionary<string, string>
        {
            ["GG0130A"] = "03", ["GG0130B"] = "04", ["GG0130C"] = "03",
            ["GG0170A"] = "03", ["GG0170C"] = "03", ["GG0170D"] = "03",
            ["GG0170E"] = "03", ["GG0170F"] = "03",
            ["GG0170I"] = "03", ["GG0170J"] = "03", ["GG0170R"] = "03",
        };
    }
}
