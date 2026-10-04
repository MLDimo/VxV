local ADDON_NAME, ns = ...

--- Entry point, loaded last: the saved data when the addon loads, then the modules once in the world.

ns.Events.On("ADDON_LOADED", function(name)
    if name == ADDON_NAME then
        VXV_DB = ns.Storage.Load(VXV_DB)
    end
end)

ns.Events.On("PLAYER_LOGIN", function()
    ns.Modules.Start()
    ns.MinimapButton.Create()
end)
