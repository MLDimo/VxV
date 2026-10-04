local _, ns = ...

--- The loot panel: opens for the whole group when the master looter opens the boss's corpse.
local LootPanel = {}
ns.LootPanel = LootPanel

local BossLoot, Group, LootView, RaidData, RowList = ns.BossLoot, ns.Group, ns.LootView, ns.RaidData, ns.RowList

-- Named: the client closes the frames listed in UISpecialFrames when Escape is pressed.
local FRAME_NAME = "VXV_LootPanel"
local WIDTH, HEIGHT = 460, 280
local INSET = 12
local TITLE_HEIGHT = 30
local NO_LOOT = "Aucun butin de boss pour l'instant : il s'affiche quand le maître du butin ouvre le corps."

local frame, list

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
    content:SetSize(WIDTH - 2 * INSET, HEIGHT - TITLE_HEIGHT - INSET)
    list = RowList.Create(content)
    table.insert(UISpecialFrames, FRAME_NAME)
end

local function render()
    local drop = BossLoot.Current()
    local rows = drop and LootView.Rows(drop, RaidData.Current(), Group.Names())
    list.SetRows(rows or { { kind = "line", text = NO_LOOT } })
end

--- Shows the panel with the current loot.
function LootPanel.Show()
    if frame == nil then
        create()
    end
    render()
    frame:Show()
end

VXV.On("loot.dropped", LootPanel.Show)

VXV.RegisterCommand("butin", "afficher le butin du dernier boss", LootPanel.Show)
