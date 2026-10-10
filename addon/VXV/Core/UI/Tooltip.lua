local ns = select(2, ...).Core

--- The game's tooltip next to a frame: a title and white lines. Without a tooltip on the client, nothing.
local Tooltip = {}
ns.Tooltip = Tooltip

local Compat = ns.Compat

local WHITE = 1
local WRAP = true

--- Shows the title and lines next to the owner frame; anchor is one of the game's ("ANCHOR_LEFT"…).
function Tooltip.Show(owner, anchor, title, lines)
    local tooltip = Compat.Resolve("GameTooltip")
    if tooltip == nil then
        return
    end
    tooltip:SetOwner(owner, anchor)
    tooltip:SetText(title)
    for _, line in ipairs(lines or {}) do
        tooltip:AddLine(line, WHITE, WHITE, WHITE, WRAP)
    end
    tooltip:Show()
end

--- Shows the game's own tooltip of an item link ("|Hitem:…|h[Nom]|h") next to the owner frame.
function Tooltip.ShowLink(owner, anchor, link)
    local tooltip = Compat.Resolve("GameTooltip")
    if tooltip == nil then
        return
    end
    tooltip:SetOwner(owner, anchor)
    tooltip:SetHyperlink(link)
    tooltip:Show()
end

function Tooltip.Hide()
    local tooltip = Compat.Resolve("GameTooltip")
    if tooltip ~= nil then
        tooltip:Hide()
    end
end
