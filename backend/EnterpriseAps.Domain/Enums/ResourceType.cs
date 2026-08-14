namespace EnterpriseAps.Domain.Enums;

public enum ResourceType
{
    // EMS & PCBA Work Centers
    SmtLine,
    ThtWaveSoldering,
    ThtSelectiveSoldering,
    InCircuitTesting,
    FunctionalTesting,
    ConformalCoating,
    DepanelingRouter,
    ManualAssembly,

    // General Industry (Backward Compatibility)
    CncMachine,
    InjectionMolding,
    AssemblyCell,
    QualityControl,
    Packaging,
    ManualWorkstation
}
