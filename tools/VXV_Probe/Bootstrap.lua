local ADDON_NAME, ns = ...

--- Entry point, loaded last: wires SavedVariables then starts every test listener.

-- SavedVariables exist only from this addon's ADDON_LOADED, never at file scope.
ns.Events.On("ADDON_LOADED", function(name)
    if name ~= ADDON_NAME then
        return
    end
    VXV_ProbeDB = VXV_ProbeDB or {}
    ns.Log.Attach(VXV_ProbeDB)
end)

ns.Events.On("PLAYER_LOGIN", function()
    ns.Registry.SetupAll(VXV_ProbeDB)
    local _, _, _, interface = GetBuildInfo()
    print(string.format("|cff14b8a6VXV_Probe|r chargé (interface client %s). /vxvtest pour l'aide.", interface))
end)
