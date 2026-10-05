local ADDON_NAME, ns = ...

--- Entry point, loaded last: the saved data when the addon loads, then, once in the world and confirmed as a
--- member of the guild, the modules, the minimap icon and the communication with the other members.

ns.Events.On("ADDON_LOADED", function(name)
    if name == ADDON_NAME then
        VXV_DB = ns.Storage.Load(VXV_DB)
        ns.Theme.Preload()
    end
end)

ns.Bus.On("guild.confirmed", function()
    ns.Comm.Start()
    ns.Presence.Announce()
    ns.Modules.Start()
    ns.MinimapButton.Create()
end)

ns.Events.On("PLAYER_LOGIN", function()
    ns.Guild.Start()
end)
