local ns = select(2, ...).Fishing

--- Fishing in one button in the Artisans place (owner's decision of 8 November): its sub-tab « Pêche » in the big
--- window, with how it works beside, and its panel in the reduced mode.
local FishingTab = {}
ns.FishingTab = FishingTab

local FishingPanel = ns.FishingPanel

local Screen, Theme = VXV.Screen, VXV.Theme

local PADDING, GAP, GRID_TOP = Screen.PADDING, Screen.GAP, Screen.GRID_TOP
local LEFT_WIDTH = 440
local COMPACT_PADDING = 14
local STEP_GAP = 34
local CHANGED = { "fishing.changed" }
local STEPS = {
    "1. « Lancer une session de pêche » : ta canne s'équipe, une fenêtre s'ouvre sur le jeu.",
    "2. Ta touche lance la ligne ; quand le bouchon plonge, la même touche ferre.",
    "3. La prise s'affiche, et la touche relance aussitôt.",
    "4. Un appât dans les sacs ? Le bouton « Appât » le pose sur la canne.",
    "5. « Quitter la session » ou un combat : ton arme revient en main.",
}

function FishingTab.Build(content)
    Screen.Head(content, "La forge", "ember", "Pêche").subtitle:SetText(
        "Une seule touche pour lancer, ferrer et relancer. Ton arme revient à la fin.")
    local height = content:GetHeight() - GRID_TOP - PADDING
    local _, body = Theme.TitledPanel(content, PADDING, GRID_TOP, LEFT_WIDTH, height, "Pêche en un bouton")
    local panel = FishingPanel.Create(body, body:GetWidth())
    local rightWidth = content:GetWidth() - 2 * PADDING - LEFT_WIDTH - GAP
    local _, help = Theme.TitledPanel(content, PADDING + LEFT_WIDTH + GAP, GRID_TOP, rightWidth, height,
        "Comment ça marche")
    for index, step in ipairs(STEPS) do
        local line = Theme.Text(help, "text", 13, "lavender")
        line:SetPoint("TOPLEFT", 0, -(index - 1) * STEP_GAP)
        line:SetWidth(help:GetWidth())
        line:SetText(step)
    end
    Screen.Follow(content, panel.Render, CHANGED)
end

function FishingTab.Compact(content)
    local body = CreateFrame("Frame", nil, content)
    body:SetPoint("TOPLEFT", COMPACT_PADDING, -COMPACT_PADDING)
    body:SetSize(content:GetWidth() - 2 * COMPACT_PADDING, content:GetHeight() - 2 * COMPACT_PADDING)
    local panel = FishingPanel.Create(body, body:GetWidth())
    Screen.Follow(content, panel.Render, CHANGED)
end
