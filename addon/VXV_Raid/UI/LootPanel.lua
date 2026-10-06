local _, ns = ...

--- The loot panel: opens for the whole group when the master looter opens the boss's corpse, then follows the
--- attribution: the member's roll button, and the master looter's buttons to give the item or cancel.
local LootPanel = {}
ns.LootPanel = LootPanel

local BossLoot, Distribution, Group, LootView = ns.BossLoot, ns.Distribution, ns.Group, ns.LootView
local RaidData, RowList = ns.RaidData, VXV.RowList

local Theme = VXV.Theme

local FRAME_NAME = "VXV_LootPanel"
local WIDTH, HEIGHT = 480, 340
-- The buttons (§3): roll in gold, give in amethyst (the main action), cancel in wood.
local BUTTON_HEIGHT, BUTTON_GAP = 28, 10
local NO_LOOT = "Aucun butin de boss pour l'instant : il s'affiche quand le maître du butin ouvre le corps."

local frame, list
local buttons = {}

local function create()
    local body
    frame, body = VXV.CreateDialog(FRAME_NAME, WIDTH, HEIGHT, "Butin")
    local content = CreateFrame("Frame", nil, body)
    content:SetPoint("TOPLEFT")
    content:SetSize(body:GetWidth(), body:GetHeight() - BUTTON_HEIGHT - BUTTON_GAP)
    list = RowList.Create(content)
    local actions = {
        { key = "roll", style = "gold", text = "Roll (1-100)", width = 130, run = Distribution.Roll },
        { key = "give", style = "pixel", text = "Donner", width = 200, run = function()
            local active = Distribution.State()
            Distribution.Give(active.result.winner)
        end },
        { key = "cancel", style = "wood", text = "Annuler", width = 100, run = Distribution.Cancel },
    }
    local x = 0
    for _, action in ipairs(actions) do
        local button = Theme.Button(body, action.style, action.text, action.width, BUTTON_HEIGHT)
        button:SetPoint("BOTTOMLEFT", x, 0)
        button:SetScript("OnClick", action.run)
        buttons[action.key] = button
        x = x + action.width + BUTTON_GAP
    end
end

local function withActions(rows)
    for _, row in ipairs(rows) do
        if row.start ~= nil then
            row.onClick = function()
                Distribution.Start(row.start)
            end
        elseif row.give ~= nil then
            row.onClick = function()
                Distribution.Give(row.give)
            end
        end
    end
    return rows
end

local function render()
    local drop = BossLoot.Current()
    local active, shown = Distribution.State()
    local rows = drop and LootView.Rows({
        drop = drop,
        event = RaidData.Current(),
        inGroup = Group.Names(),
        active = active,
        shown = shown,
        isMasterLooter = Distribution.IsMasterLooter(),
    })
    list.SetRows(rows and withActions(rows) or { { kind = "line", text = NO_LOOT } })
    buttons.roll:SetShown(shown ~= nil and shown.canRoll and not shown.rolled)
    buttons.give:SetShown(active ~= nil and active.result ~= nil)
    if active ~= nil and active.result ~= nil then
        buttons.give:SetText("Donner à " .. active.result.winner)
    end
    buttons.cancel:SetShown(active ~= nil)
end

--- Shows the panel with the current loot.
function LootPanel.Show()
    if frame == nil then
        create()
    end
    render()
    frame:Show()
end

local function refresh()
    if frame ~= nil and frame:IsShown() then
        render()
    end
end

VXV.On("loot.dropped", LootPanel.Show)
VXV.On("loot.distribution", function()
    local _, shown = Distribution.State()
    if shown ~= nil then
        LootPanel.Show()
    else
        refresh()
    end
end)

VXV.RegisterCommand("butin", "afficher le butin du dernier boss", LootPanel.Show)
