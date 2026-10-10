local ns = select(2, ...).Missions

--- The Quêtes tab of the reduced mode (§7.8): the running quest, its ranking and the player's progress.
local QuestsCompact = {}
ns.QuestsCompact = QuestsCompact

local QuestsData, QuestsView = ns.QuestsData, ns.QuestsView

function QuestsCompact.Build(frame)
    VXV.Screen.Compact(frame, function()
        return QuestsView.Board(QuestsData.Current(), time())
    end, { "quetes.updated", "quetes.live" })
end
