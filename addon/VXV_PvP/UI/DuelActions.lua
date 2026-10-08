local _, ns = ...

--- What the player does with a duel, in game: the opponent takes up or turns down the challenge, a player concedes
--- the duel or calls it off. Sent to the website as a change.
local DuelActions = {}
ns.DuelActions = DuelActions

local Changes, PvpView = ns.Changes, ns.PvpView

local Theme = VXV.Theme

local WIDTH, HEIGHT = 420, 220
local BUTTON_WIDTH, BUTTON_HEIGHT, GAP, BUTTONS_TOP = 180, 30, 8, 40
local DATE = "%d/%m %H:%M"
-- Each action: its button, and the change it sends.
local ACTIONS = {
    { key = "accept", label = "Relever le défi", change = { kind = "duelAnswer", accept = true } },
    { key = "refuse", label = "Refuser", change = { kind = "duelAnswer", accept = false } },
    { key = "concede", label = "J'ai perdu", change = { kind = "duelConcede" } },
    { key = "cancel", label = "Annuler le duel", change = { kind = "duelCancel" } },
}

local frame, body, subtitle, duel
local buttons = {}

local function act(action)
    local change = { duelId = duel.id }
    for key, value in pairs(action.change) do
        change[key] = value
    end
    if Changes.Submit(change) then
        frame:Hide()
    end
end

local function build()
    frame, body = VXV.CreateDialog("VXV_DuelActions", WIDTH, HEIGHT, "Duel")
    subtitle = Theme.Text(body, "text", 13, "lavender")
    subtitle:SetPoint("TOPLEFT")
    for index, action in ipairs(ACTIONS) do
        local button = Theme.Button(body, "wood", action.label, BUTTON_WIDTH, BUTTON_HEIGHT, "gold")
        local column, line = (index - 1) % 2, math.floor((index - 1) / 2)
        button:SetPoint("TOPLEFT", column * (BUTTON_WIDTH + GAP), -(BUTTONS_TOP + line * (BUTTON_HEIGHT + GAP)))
        button:SetScript("OnClick", function()
            act(action)
        end)
        buttons[action.key] = button
    end
end

--- Opens the player's actions on the duel.
function DuelActions.Open(chosen)
    if frame == nil then
        build()
    end
    duel = chosen
    local allowed = PvpView.Actions(duel, VXV.MemberOf(ns.PvpData.Current()))
    for key, button in pairs(buttons) do
        button:SetShown(allowed[key] == true)
    end
    subtitle:SetText(date(DATE, duel.scheduledAt) .. " · " .. duel.place)
    frame:Show()
end
