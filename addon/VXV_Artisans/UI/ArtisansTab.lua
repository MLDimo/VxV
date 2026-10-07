local _, ns = ...

--- The Artisans place (P14.4): « Qui peut fabriquer… ? » with its search field and its results, and the player's own
--- professions.
local ArtisansTab = {}
ns.ArtisansTab = ArtisansTab

local ArtisansView = ns.ArtisansView

local RowList, Screen, Theme = VXV.RowList, VXV.Screen, VXV.Theme

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
local RIGHT = 320
local SEARCH_LETTERS = 60
-- The search field above the results, and the room under it.
local FIELD_ROOM = 40

local field, results, mine

local function renderResults()
    results.SetRows(ArtisansView.Results(field:GetText() or ""))
end

local function render()
    renderResults()
    mine.SetRows(ArtisansView.Mine())
end

function ArtisansTab.Build(content)
    Screen.Head(content, "La forge", "ember", "Artisans").subtitle:SetText(
        "Relevés par l'addon : le niveau à la connexion, les recettes à l'ouverture de chaque métier.")
    local height = content:GetHeight() - GRID_TOP - PADDING
    local searchWidth = content:GetWidth() - 2 * PADDING - RIGHT - GAP
    local _, body = Theme.TitledPanel(content, PADDING, GRID_TOP, searchWidth, height, "Qui peut fabriquer… ?")
    local holder
    holder, field = Theme.Field(body, body:GetWidth(), SEARCH_LETTERS)
    holder:SetPoint("TOPLEFT")
    field:SetScript("OnTextChanged", renderResults)
    results = RowList.Create(body, FIELD_ROOM)
    mine = RowList.Panel(content, PADDING + searchWidth + GAP, GRID_TOP, RIGHT, height, "Mes métiers")
    Screen.Follow(content, render, { "artisans.updated" })
end
