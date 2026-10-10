local ns = select(2, ...).Core

--- The full window and the reduced mode (§7.8): /vxv and the minimap icon open the one the player used last, and
--- each switches to the other on the same place.
local Windows = {}
ns.Windows = Windows

local Bus, CompactWindow, Storage, Window = ns.Bus, ns.CompactWindow, ns.Storage, ns.Window

function Windows.Toggle()
    if Storage.Interface("window").reduced then
        CompactWindow.Toggle()
    else
        Window.Toggle()
    end
end

Bus.On("window.reduce", function(placeId)
    Storage.Interface("window").reduced = true
    Window.Hide()
    CompactWindow.Open(placeId)
end)

Bus.On("window.expand", function(placeId)
    Storage.Interface("window").reduced = false
    CompactWindow.Hide()
    Window.Open(placeId)
end)
