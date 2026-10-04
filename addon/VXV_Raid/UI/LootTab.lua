local _, ns = ...

--- The Butin tab: the raids' records, and the officers' export of the current raid's record for the website.
local LootTab = {}
ns.LootTab = LootTab

local LogView, RaidData, RaidLog, RowList = ns.LogView, ns.RaidData, ns.RaidLog, ns.RowList

local BUTTON_WIDTH, BUTTON_HEIGHT = 170, 22
local READY = "Journal du raid prêt : Ctrl+C, puis colle-le sur la page de l'événement du site (officiers)."
local NOTHING = "Rien à exporter : aucun raid enregistré pour l'événement chargé."

local content, list, exportButton

local function export()
    local log = RaidLog.Current()
    if log == nil or (#log.kills == 0 and #log.loots == 0) then
        VXV.Print(NOTHING)
        return
    end
    VXV.ShowCopyWindow(RaidLog.Export(log))
    VXV.Print(READY)
end

local function render()
    local event = RaidData.Current()
    list.SetRows(LogView.Rows(RaidLog.All(), event and event.id))
    exportButton:SetShown(RaidData.IsOfficer(VXV.PlayerName()))
end

function LootTab.Build(frame)
    content = frame
    exportButton = CreateFrame("Button", nil, content, "UIPanelButtonTemplate")
    exportButton:SetSize(BUTTON_WIDTH, BUTTON_HEIGHT)
    exportButton:SetPoint("TOPLEFT")
    exportButton:SetText("Exporter pour le site")
    exportButton:SetScript("OnClick", export)
    list = RowList.Create(content, BUTTON_HEIGHT)
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("raid.log", refresh)
VXV.On("raid.updated", refresh)

VXV.RegisterCommand("journal", "exporter le journal du raid pour le site (officiers)", export)
