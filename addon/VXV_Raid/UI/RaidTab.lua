local _, ns = ...

--- The Raid tab: the event's rows in a scrolling list, a tooltip on the rows that have one, and the officers'
--- button to load the data.
local RaidTab = {}
ns.RaidTab = RaidTab

local Import, RaidData, RaidView = ns.Import, ns.RaidData, ns.RaidView

local ROW_HEIGHT = 18
local SCROLLBAR_WIDTH = 26
local BUTTON_WIDTH, BUTTON_HEIGHT = 150, 22
local FONTS = { title = "GameFontNormalLarge", header = "GameFontNormal", line = "GameFontHighlight" }

local content, list, importButton
local rowFrames = {}

local function showRowTooltip(frame)
    if frame.tooltip ~= nil then
        VXV.ShowTooltip(frame, "ANCHOR_RIGHT", frame.tooltip.title, frame.tooltip.lines)
    end
end

local function newRow(index)
    local frame = CreateFrame("Frame", nil, list)
    frame:SetSize(list:GetWidth(), ROW_HEIGHT)
    frame:SetPoint("TOPLEFT", 0, -(index - 1) * ROW_HEIGHT)
    frame:EnableMouse(true)
    frame:SetScript("OnEnter", showRowTooltip)
    frame:SetScript("OnLeave", VXV.HideTooltip)
    frame.label = frame:CreateFontString(nil, "OVERLAY", FONTS.line)
    frame.label:SetPoint("LEFT")
    frame.label:SetWidth(list:GetWidth())
    frame.label:SetJustifyH("LEFT")
    frame.label:SetWordWrap(false)
    rowFrames[index] = frame
    return frame
end

--- Officers load the data; anybody may load the first one, refused unless the website names them officer.
local function canImport()
    return RaidData.Current() == nil or RaidData.IsOfficer(VXV.PlayerName())
end

local function render()
    local _, sender = RaidData.Text()
    local rows = RaidView.Rows(RaidData.Current(), VXV.PlayerName(), sender)
    for index, data in ipairs(rows) do
        local frame = rowFrames[index] or newRow(index)
        frame.label:SetFontObject(FONTS[data.kind])
        frame.label:SetText(data.text)
        frame.tooltip = data.tooltip
        frame:Show()
    end
    for index = #rows + 1, #rowFrames do
        rowFrames[index]:Hide()
    end
    list:SetHeight(#rows * ROW_HEIGHT)
    importButton:SetShown(canImport())
end

function RaidTab.Build(frame)
    content = frame
    importButton = CreateFrame("Button", nil, content, "UIPanelButtonTemplate")
    importButton:SetSize(BUTTON_WIDTH, BUTTON_HEIGHT)
    importButton:SetPoint("TOPRIGHT")
    importButton:SetText("Charger les données")
    importButton:SetScript("OnClick", Import.Open)
    local scroll = CreateFrame("ScrollFrame", nil, content, "UIPanelScrollFrameTemplate")
    scroll:SetPoint("TOPLEFT", 0, -BUTTON_HEIGHT)
    scroll:SetPoint("BOTTOMRIGHT", -SCROLLBAR_WIDTH, 0)
    list = CreateFrame("Frame", nil, scroll)
    list:SetWidth(content:GetWidth() - SCROLLBAR_WIDTH)
    scroll:SetScrollChild(list)
    render()
end

VXV.On("raid.updated", function()
    if content ~= nil then
        render()
    end
end)
