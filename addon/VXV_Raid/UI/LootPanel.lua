local _, ns = ...

--- The loot panel: opens for the whole group when the master looter opens the boss's corpse, then follows the
--- attribution: the member's roll button, and the master looter's buttons to give the item or cancel.
local LootPanel = {}
ns.LootPanel = LootPanel

local BossLoot, Distribution, Group, LootView = ns.BossLoot, ns.Distribution, ns.Group, ns.LootView
local RaidData, RowList = ns.RaidData, ns.RowList

-- Named: the client closes the frames listed in UISpecialFrames when Escape is pressed.
local FRAME_NAME = "VXV_LootPanel"
local WIDTH, HEIGHT = 460, 320
local INSET = 12
local TITLE_HEIGHT = 30
local BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_GAP = 140, 22, 6
local NO_LOOT = "Aucun butin de boss pour l'instant : il s'affiche quand le maître du butin ouvre le corps."

local frame, list
local buttons = {}

local function addButton(text, onClick, index)
    local button = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
    button:SetSize(BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMLEFT", INSET + (index - 1) * (BUTTON_WIDTH + BUTTON_GAP), INSET)
    button:SetText(text)
    button:SetScript("OnClick", onClick)
    return button
end

local function create()
    local ok, templated = pcall(CreateFrame, "Frame", FRAME_NAME, UIParent, "BasicFrameTemplateWithInset")
    frame = ok and templated or CreateFrame("Frame", FRAME_NAME, UIParent)
    frame:SetSize(WIDTH, HEIGHT)
    frame:SetPoint("CENTER")
    frame:SetFrameStrata("HIGH")
    frame:SetMovable(true)
    frame:SetClampedToScreen(true)
    frame:EnableMouse(true)
    frame:RegisterForDrag("LeftButton")
    frame:SetScript("OnDragStart", frame.StartMoving)
    frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
    local content = CreateFrame("Frame", nil, frame)
    content:SetPoint("TOPLEFT", INSET, -TITLE_HEIGHT)
    content:SetSize(WIDTH - 2 * INSET, HEIGHT - TITLE_HEIGHT - BUTTON_HEIGHT - 3 * INSET)
    list = RowList.Create(content)
    buttons.roll = addButton("Roll (1-100)", Distribution.Roll, 1)
    buttons.give = addButton("Donner", function()
        local active = Distribution.State()
        Distribution.Give(active.result.winner)
    end, 2)
    buttons.cancel = addButton("Annuler", Distribution.Cancel, 3)
    table.insert(UISpecialFrames, FRAME_NAME)
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
