local ADDON_NAME, ns = ...

--- Entry point, loaded last: the saved data when the addon loads, then, once the modules started, the inbox to the
--- bundles and what VXV_Sync records itself for the website.

VXV.OnEvent("ADDON_LOADED", function(name)
    if name == ADDON_NAME then
        VXV_SyncDB = ns.Outbox.Load(VXV_SyncDB)
    end
end)

VXV.On("modules.started", function()
    ns.Companion.Deliver()
    if ns.Companion.IsPresent() then
        ns.Character.Record()
        ns.Roster.Start()
    end
end)
