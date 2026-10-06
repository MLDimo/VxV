local _, ns = ...

--- The Quêtes tab of the reduced mode (§7.8): the running quest, its ranking and the player's progress.
local QuestsCompact = {}
ns.QuestsCompact = QuestsCompact

local QuestsData, QuestsView = ns.QuestsData, ns.QuestsView
local RowList = VXV.RowList

local PADDING = 10

local content, list

local function render()
    list.SetRows(QuestsView.Board(QuestsData.Current(), time()))
end

function QuestsCompact.Build(frame)
    content = frame
    local body = CreateFrame("Frame", nil, content)
    body:SetPoint("TOPLEFT", PADDING, -PADDING)
    body:SetSize(content:GetWidth() - 2 * PADDING, content:GetHeight() - 2 * PADDING)
    list = RowList.Create(body)
    content:SetScript("OnShow", render)
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("quetes.updated", refresh)
VXV.On("quetes.live", refresh)
