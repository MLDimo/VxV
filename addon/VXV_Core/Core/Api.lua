local _, ns = ...

--- The only global of VXV_Core: the public API of the feature bundles (VXV_Raid, VXV_Paris…),
--- whose private namespaces cannot see the core's.
VXV = {
    RegisterModule = ns.Modules.Register,
    On = ns.Bus.On,
    Emit = ns.Bus.Emit,
}
