local ns = select(2, ...).Core

--- A player of Le Dé Pipé's games (mockups AddonDeathroll and AddonChifoumi): a frame in the class color, copper rings
--- around it, the portrait of the charter (the website gives it) or else the name's initial; a gold ring blinks at the
--- player's turn.
local PlayerCard = {}
ns.PlayerCard = PlayerCard

local Theme = ns.Theme

local RINGS = { { "ink", 3 }, { "copper", 4 }, { "ink", 3 } }
-- The portrait inside the frame, and the initial without one.
local PORTRAIT_SHARE, INITIAL_SHARE = 0.875, 0.43
-- The turn's ring blinks in two steps.
local BLINK_SECONDS = 0.6

--- Creates the card, of this size, under the parent; place card.frame.
function PlayerCard.Create(parent, size)
    local card = {}
    card.frame = CreateFrame("Frame", nil, parent)
    card.frame:SetSize(size, size)
    card.color = Theme.Fill(card.frame, "copper", "ARTWORK")
    card.color:SetAllPoints()
    card.rings = Theme.Rings(card.frame, RINGS)
    local portraitSize = math.floor(size * PORTRAIT_SHARE)
    local ground = Theme.Fill(card.frame, "avatar-ground", "ARTWORK")
    ground:SetSize(portraitSize, portraitSize)
    ground:SetPoint("CENTER")
    card.portrait = card.frame:CreateTexture(nil, "OVERLAY")
    card.portrait:SetSize(portraitSize, portraitSize)
    card.portrait:SetPoint("CENTER")
    card.initial = Theme.Text(card.frame, "pixelBold", math.floor(size * INITIAL_SHARE), "banner-ink")
    card.initial:SetPoint("CENTER")

    --- The player: "Prénom Nom", their class token, their portrait's file (nil: the initial).
    function card.Set(name, class, portrait)
        card.color:SetColorTexture(Theme.ClassColor(class))
        if portrait ~= nil then
            card.portrait:SetTexture(portrait, nil, nil, "NEAREST")
        end
        card.portrait:SetShown(portrait ~= nil)
        card.initial:SetText(portrait == nil and name:sub(1, 1) or "")
    end

    --- Whether it is the player's turn: the copper ring blinks gold.
    function card.SetTurn(turn)
        local lit = turn and math.floor(GetTime() / BLINK_SECONDS) % 2 == 1
        Theme.Recolor(card.rings[2], lit and "gold" or "copper")
    end

    return card
end
