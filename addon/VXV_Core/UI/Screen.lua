local _, ns = ...

--- A place's screen in the windows (§2.5, §6), as every bundle builds it (VXV.Screen): its head (kicker in the
--- place's color, title, subtitle, badges on the right), its grid's margins, and how it follows its data (drawn
--- again each time it shows and after each of its bus events). Also the simple tabs of the reduced mode, one list.
local Screen = {}
ns.Screen = Screen

local Bus, RowList, Theme, Tokens = ns.Bus, ns.RowList, ns.Theme, ns.Tokens

-- The screen's margins, the room between its panels, and the top of its grid under the head.
Screen.PADDING, Screen.GAP, Screen.GRID_TOP = 22, 16, 96
local TITLE_GAP, SUBTITLE_GAP = 6, 6
local BADGE_HEIGHT, BADGE_PADDING, BADGE_GAP, BADGE_ALPHA = 24, 16, 6, 0.14
local COMPACT_PADDING = 10

--- The screen's head: { kicker, title, subtitle } as font strings, at the screen's corner; without a kicker (nil),
--- the title takes its place.
function Screen.Head(frame, kicker, color, title)
    local head = {}
    if kicker ~= nil then
        head.kicker = Theme.Text(frame, "textHeavy", 11, color or "sakura")
        head.kicker:SetText(Theme.Upper(kicker))
        head.kicker:SetPoint("TOPLEFT", Screen.PADDING, -Screen.PADDING)
    end
    head.title = Theme.Text(frame, "pixelBold", 30, "ivory")
    head.title:SetText(title)
    if head.kicker == nil then
        head.title:SetPoint("TOPLEFT", Screen.PADDING, -Screen.PADDING)
    else
        head.title:SetPoint("TOPLEFT", head.kicker, "BOTTOMLEFT", 0, -TITLE_GAP)
    end
    head.subtitle = Theme.Text(frame, "text", 13, "muted")
    head.subtitle:SetPoint("TOPLEFT", head.title, "BOTTOMLEFT", 0, -SUBTITLE_GAP)
    return head
end

--- The badges on the right of the head (§2.5): Set({ { text, color } }) shows them, from the right.
function Screen.Badges(frame)
    local badges = {}
    local function add(index)
        local badge = CreateFrame("Frame", nil, frame)
        badge:SetHeight(BADGE_HEIGHT)
        badge.background = badge:CreateTexture(nil, "BACKGROUND")
        badge.background:SetAllPoints()
        badge.label = Theme.Text(badge, "textHeavy", 12, "gain")
        badge.label:SetPoint("CENTER")
        badges[index] = badge
        return badge
    end
    return {
        Set = function(items)
            local right = -Screen.PADDING
            for index = 1, math.max(#items, #badges) do
                local item = items[index]
                local badge = badges[index] or add(index)
                badge:SetShown(item ~= nil)
                if item ~= nil then
                    local r, g, b = Theme.Color(item.color)
                    badge.background:SetColorTexture(r, g, b, BADGE_ALPHA)
                    badge.label:SetTextColor(r, g, b, 1)
                    badge.label:SetText(item.text)
                    badge:SetWidth(badge.label:GetStringWidth() + BADGE_PADDING)
                    badge:ClearAllPoints()
                    badge:SetPoint("TOPRIGHT", right, -Screen.PADDING)
                    right = right - badge:GetWidth() - BADGE_GAP
                end
            end
        end,
    }
end

--- Draws the screen now, each time it shows (what depends on the time is then up to date), and after each of the
--- bus events.
function Screen.Follow(frame, render, events)
    frame:SetScript("OnShow", render)
    for _, event in ipairs(events or {}) do
        Bus.On(event, render)
    end
    render()
end

--- The place of the tavern of this id ("raid", "dice"…), or nil.
function Screen.Place(placeId)
    for _, place in ipairs(Tokens.places) do
        if place.id == placeId then
            return place
        end
    end
end

--- A simple tab of the reduced mode: the frame filled with a list of rows(). Returns the list.
function Screen.Compact(frame, rows, events)
    local body = CreateFrame("Frame", nil, frame)
    body:SetPoint("TOPLEFT", COMPACT_PADDING, -COMPACT_PADDING)
    body:SetSize(frame:GetWidth() - 2 * COMPACT_PADDING, frame:GetHeight() - 2 * COMPACT_PADDING)
    local list = RowList.Create(body)
    Screen.Follow(frame, function()
        list.SetRows(rows())
    end, events)
    return list
end
