local _, ns = ...

--- The Quêtes tab of the reduced mode (§7.8): the running quest, its ranking and the player's progress.
local QuestsCompact = {}
ns.QuestsCompact = QuestsCompact

local QuestsData, QuestsView = ns.QuestsData, ns.QuestsView

local PADDING = 10

function QuestsCompact.Build(frame)
    VXV.RowList.Fill(frame, PADDING, function()
        return QuestsView.Board(QuestsData.Current(), time())
    end, { "quetes.updated", "quetes.live" })
end
