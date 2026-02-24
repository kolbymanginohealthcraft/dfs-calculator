using Xunit;

namespace DFSCalculator.Server.Tests;

/// <summary>
/// Shared fixture that sets the working directory to the server project root
/// so the static data loaders (CoefficientLoader, ConditionMap, etc.) can find
/// their ./Data/*.json files.  Applied once per test collection.
/// </summary>
public class DataDirectoryFixture : IDisposable
{
    private readonly string _originalDirectory;

    public DataDirectoryFixture()
    {
        _originalDirectory = Directory.GetCurrentDirectory();

        // From bin/Debug/net8.0 → walk up to the test project root,
        // then over to the server project that owns the Data/ folder.
        var serverProjectDir = Path.GetFullPath(
            Path.Combine(_originalDirectory, "..", "..", "..", "..", "DFSCalculator.Server"));

        if (Directory.Exists(Path.Combine(serverProjectDir, "Data")))
        {
            Directory.SetCurrentDirectory(serverProjectDir);
        }
        else
        {
            // Fallback: data files were linked into the test output directory
            // (via the <Content Include> in the .csproj), so current dir is fine.
        }
    }

    public void Dispose()
    {
        Directory.SetCurrentDirectory(_originalDirectory);
    }
}

[CollectionDefinition("DataDirectory")]
public class DataDirectoryCollection : ICollectionFixture<DataDirectoryFixture> { }
