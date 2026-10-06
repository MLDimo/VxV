local _, ns = ...

--- The Artisans place (P14.4): « Qui peut fabriquer… ? » with its search field and its results, and the player's own
--- professions.
local ArtisansTab = {}
ns.ArtisansTab = ArtisansTab

local ArtisansView = ns.ArtisansView

local RowList, Theme = VXV.RowList, VXV.Theme

local PADDING, GAP = 22, 16
local GRID_TOP = 96
local RIGHT = 320
local SEARCH_LETTERS = 60
-- The search field above the results, and the room under it.
local FIELD_ROOM = 40

local content, field, results, mine

local function renderResults()
    results.SetRows(ArtisansView.Results(field:GetText() or ""))
end

local function render()
    renderResults()
    mine.SetRows(ArtisansView.Mine())
end

function ArtisansTab.Build(frame)
    content = frame
    local kicker, title = Theme.ScreenHeader(content, "La forge", "ember", "Artisans")
    kicker:SetPoint("TOPLEFT", PADDING, -PADDING)
    local subtitle = Theme.Text(content, "text", 13, "muted")
    subtitle:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -6)
    subtitle:SetText("Relevés par l'addon : le niveau à la connexion, les recettes à l'ouverture de chaque métier.")
    local height = content:GetHeight() - GRID_TOP - PADDING
    local searchWidth = content:GetWidth() - 2 * PADDING - RIGHT - GAP
    local _, body = Theme.TitledPanel(content, PADDING, GRID_TOP, searchWidth, height, "Qui peut fabriquer… ?")
    local holder
    holder, field = Theme.Field(body, body:GetWidth(), SEARCH_LETTERS)
    holder:SetPoint("TOPLEFT")
    field:SetScript("OnTextChanged", renderResults)
    results = RowList.Create(body, FIELD_ROOM)
    mine = RowList.Panel(content, PADDING + searchWidth + GAP, GRID_TOP, RIGHT, height, "Mes métiers")
    content:SetScript("OnShow", render)
    render()
end

VXV.On("artisans.updated", function()
    if content ~= nil then
        render()
    end
end)
