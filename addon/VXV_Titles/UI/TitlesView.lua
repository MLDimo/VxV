local _, ns = ...

--- What the Ranking screen shows (§7.5), as rows for the core's lists: each title of the week, its holder in their
--- class color and its rule.
local TitlesView = {}
ns.TitlesView = TitlesView

local Titles = ns.Titles
local Theme = VXV.Theme

local DATE = "%d/%m %H:%M"
local NO_DATA = "Aucune donnée des titres : un officier les envoie à la guilde, ou ton compagnon VXV les apporte."
local NOBODY = "Personne cette semaine"

--- The head of the screen: when the titles were given, and when the data were exported.
function TitlesView.Subtitle(data)
    if data == nil then
        return NO_DATA
    end
    return "Chaque mercredi au reset, au membre en tête sur la saison · données du " .. date(DATE, data.exportedAt)
end

--- Each title of the week, as a card.
function TitlesView.Week(data)
    local rows = {}
    for _, title in ipairs(data ~= nil and data.titles or {}) do
        local holder = title.holder == nil and Theme.Colored(NOBODY, "muted")
            or VXV.ClassColored(title.holder, title.class)
        rows[#rows + 1] = { kind = "card", text = Titles.Label(title.name) .. "  " .. holder, detail = title.rule }
    end
    return rows
end
