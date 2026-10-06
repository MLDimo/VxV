local _, ns = ...

--- The Ranking place (§7.5): above the fireplace, the titles of the week with their holders and rules; and its tab
--- in the reduced mode (§7.8).
local RankingTab = {}
ns.RankingTab = RankingTab

local TitlesData, TitlesView = ns.TitlesData, ns.TitlesView
local RowList, Theme = VXV.RowList, VXV.Theme

local PADDING = 22
local GRID_TOP = 96
local COMPACT_PADDING = 10
local UPDATED = "titres.updated"

local content, subtitle, list

local function render()
    local data = TitlesData.Current()
    subtitle:SetText(TitlesView.Subtitle(data))
    list.SetRows(TitlesView.Week(data))
end

function RankingTab.Build(frame)
    content = frame
    local kicker, title = Theme.ScreenHeader(content, "Au-dessus de la cheminée", "gold", "Ranking")
    kicker:SetPoint("TOPLEFT", PADDING, -PADDING)
    subtitle = Theme.Text(content, "text", 13, "muted")
    subtitle:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -6)
    list = RowList.Panel(content, PADDING, GRID_TOP, content:GetWidth() - 2 * PADDING,
        content:GetHeight() - GRID_TOP - PADDING, "Titres de la semaine")
    content:SetScript("OnShow", render)
    render()
end

function RankingTab.Compact(frame)
    RowList.Fill(frame, COMPACT_PADDING, function()
        return TitlesView.Week(TitlesData.Current())
    end, { UPDATED })
end

VXV.On(UPDATED, function()
    if content ~= nil then
        render()
    end
end)
