using Aegis.DfsCalculator.Server.Utils;
using Xunit;

namespace DFSCalculator.Server.Tests;

[Collection("DataDirectory")]
public class CoefficientLoaderTests
{
    // -----------------------------------------------------------------------
    // ParseArdDate
    // -----------------------------------------------------------------------
    [Fact]
    public void ParseArdDate_ReturnsNull_ForNullOrEmpty()
    {
        Assert.Null(CoefficientLoader.ParseArdDate(null!));
        Assert.Null(CoefficientLoader.ParseArdDate(""));
    }

    [Fact]
    public void ParseArdDate_Parses_YYYYMMDD()
    {
        var result = CoefficientLoader.ParseArdDate("20250115");
        Assert.NotNull(result);
        Assert.Equal(2025, result!.Value.Year);
        Assert.Equal(1, result.Value.Month);
        Assert.Equal(15, result.Value.Day);
    }

    [Fact]
    public void ParseArdDate_Parses_ISOFormat()
    {
        var result = CoefficientLoader.ParseArdDate("2025-01-15");
        Assert.NotNull(result);
        Assert.Equal(2025, result!.Value.Year);
        Assert.Equal(1, result.Value.Month);
        Assert.Equal(15, result.Value.Day);
    }

    [Fact]
    public void ParseArdDate_Parses_UnixTimestamp()
    {
        // 1737000000 = 2025-01-16 (approximately)
        var result = CoefficientLoader.ParseArdDate("1737000000");
        Assert.NotNull(result);
        Assert.Equal(2025, result!.Value.Year);
    }

    [Fact]
    public void ParseArdDate_ReturnsNull_ForGarbage()
    {
        Assert.Null(CoefficientLoader.ParseArdDate("not-a-date"));
    }

    // -----------------------------------------------------------------------
    // LoadAllVersions
    // -----------------------------------------------------------------------
    [Fact]
    public void LoadAllVersions_LoadsSuccessfully()
    {
        var data = CoefficientLoader.LoadAllVersions();
        Assert.NotNull(data);
        Assert.NotNull(data.Schedule);
        Assert.NotNull(data.FunctionMultipliers);
        Assert.NotNull(data.ImputationMultipliers);
        Assert.NotNull(data.Metadata);
    }

    [Fact]
    public void LoadAllVersions_ScheduleHasAtLeastOneEntry()
    {
        var data = CoefficientLoader.LoadAllVersions();
        Assert.True(data.Schedule.Count >= 1);
    }

    [Fact]
    public void LoadAllVersions_FunctionMultipliersMatchScheduleUpdateIds()
    {
        var data = CoefficientLoader.LoadAllVersions();
        foreach (var schedule in data.Schedule)
        {
            Assert.True(data.FunctionMultipliers.ContainsKey(schedule.UpdateId),
                $"FunctionMultipliers missing key for UpdateId {schedule.UpdateId}");
        }
    }

    [Fact]
    public void LoadAllVersions_ImputationMultipliersMatchScheduleUpdateIds()
    {
        var data = CoefficientLoader.LoadAllVersions();
        foreach (var schedule in data.Schedule)
        {
            Assert.True(data.ImputationMultipliers.ContainsKey(schedule.UpdateId),
                $"ImputationMultipliers missing key for UpdateId {schedule.UpdateId}");
        }
    }

    // -----------------------------------------------------------------------
    // GetUpdateIdForDate
    // -----------------------------------------------------------------------
    [Fact]
    public void GetUpdateIdForDate_ReturnsLatest_WhenDateIsNull()
    {
        var data = CoefficientLoader.LoadAllVersions();
        string expected = data.Schedule[data.Schedule.Count - 1].UpdateId;

        Assert.Equal(expected, CoefficientLoader.GetUpdateIdForDate(null));
    }

    [Fact]
    public void GetUpdateIdForDate_MatchesFirstSchedule_ForEarlyDate()
    {
        var data = CoefficientLoader.LoadAllVersions();
        var firstSchedule = data.Schedule[0];
        var testDate = firstSchedule.startDate.AddDays(5);

        string updateId = CoefficientLoader.GetUpdateIdForDate(testDate);
        Assert.Equal(firstSchedule.UpdateId, updateId);
    }

    [Fact]
    public void GetUpdateIdForDate_MatchesCorrectPeriod_ForStartBoundary()
    {
        var data = CoefficientLoader.LoadAllVersions();
        foreach (var schedule in data.Schedule)
        {
            string updateId = CoefficientLoader.GetUpdateIdForDate(schedule.startDate);
            Assert.Equal(schedule.UpdateId, updateId);
        }
    }

    [Fact]
    public void GetUpdateIdForDate_ReturnsLatest_ForFarFutureDate()
    {
        var data = CoefficientLoader.LoadAllVersions();
        string expected = data.Schedule[data.Schedule.Count - 1].UpdateId;

        Assert.Equal(expected, CoefficientLoader.GetUpdateIdForDate(new DateTime(2099, 12, 31)));
    }

    // -----------------------------------------------------------------------
    // GetFunctionMultipliers
    // -----------------------------------------------------------------------
    [Fact]
    public void GetFunctionMultipliers_ReturnsNonEmptyDictionary()
    {
        var mult = CoefficientLoader.GetFunctionMultipliers("20250115");
        Assert.NotNull(mult);
        Assert.True(mult.Count > 0);
    }

    [Fact]
    public void GetFunctionMultipliers_ContainsModelIntercept()
    {
        var mult = CoefficientLoader.GetFunctionMultipliers("20250115");
        Assert.True(mult.ContainsKey("Model Intercept"));
        Assert.NotNull(mult["Model Intercept"]);
    }

    [Fact]
    public void GetFunctionMultipliers_ContainsAdmissionFunctionKeys()
    {
        var mult = CoefficientLoader.GetFunctionMultipliers("20250115");
        Assert.True(mult.ContainsKey("Admission Function - Continuous Form"));
        Assert.True(mult.ContainsKey("Admission Function - Squared Form"));
    }

    // -----------------------------------------------------------------------
    // GetImputationMultipliers
    // -----------------------------------------------------------------------
    [Fact]
    public void GetImputationMultipliers_ReturnsNestedDictionary()
    {
        var mult = CoefficientLoader.GetImputationMultipliers(new DateTime(2025, 1, 15));
        Assert.NotNull(mult);
        Assert.True(mult.Count > 0);
        Assert.All(mult.Keys, key => Assert.StartsWith("GG", key));
    }

    // -----------------------------------------------------------------------
    // GetScheduleInfo / GetAllSchedules
    // -----------------------------------------------------------------------
    [Fact]
    public void GetScheduleInfo_ReturnsCorrectEntry()
    {
        var data = CoefficientLoader.LoadAllVersions();
        var firstSchedule = data.Schedule[0];
        var testDate = firstSchedule.startDate.AddDays(1);

        var info = CoefficientLoader.GetScheduleInfo(testDate);
        Assert.Equal(firstSchedule.UpdateId, info.UpdateId);
        Assert.Equal(firstSchedule.FiscalYear, info.FiscalYear);
    }

    [Fact]
    public void GetAllSchedules_ReturnsAllEntries()
    {
        var schedules = CoefficientLoader.GetAllSchedules();
        var data = CoefficientLoader.LoadAllVersions();
        Assert.Equal(data.Schedule.Count, schedules.Count);
    }

    [Fact]
    public void GetVersionFromArdDate_IsSameAsGetScheduleInfo()
    {
        var testDate = new DateTime(2025, 3, 15);
        var a = CoefficientLoader.GetScheduleInfo(testDate);
        var b = CoefficientLoader.GetVersionFromArdDate(testDate);
        Assert.Equal(a.UpdateId, b.UpdateId);
    }

    // -----------------------------------------------------------------------
    // Metadata
    // -----------------------------------------------------------------------
    [Fact]
    public void GetMetadata_ReturnsValidMetadata()
    {
        var meta = CoefficientLoader.GetMetadata();
        Assert.NotNull(meta);
        Assert.True(meta.UpdateCount >= 1);
    }
}
