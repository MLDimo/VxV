local _, ns = ...

--- The Raid tab: the event's rows in a scrolling list, a tooltip on the rows that have one, a click on the
--- requests to invite, and the buttons: load the data, open the invitations, invite everyone (officers), join.
local RaidTab = {}
ns.RaidTab = RaidTab

local Import, Invitations, RaidData, RaidView = ns.Import, ns.Invitations, ns.RaidData, ns.RaidView

local ROW_HEIGHT = 18
local SCROLLBAR_WIDTH = 26
local BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_GAP = 150, 22, 4
local FONTS = { title = "GameFontNormalLarge", header = "GameFontNormal", line = "GameFontHighlight" }

local content, list
local buttons = {}
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
    frame:SetScript("OnMouseUp", function()
        if frame.invite ~= nil then
            Invitations.Invite(frame.invite)
        end
    end)
    frame.label = frame:CreateFontString(nil, "OVERLAY", FONTS.line)
    frame.label:SetPoint("LEFT")
    frame.label:SetWidth(list:GetWidth())
    frame.label:SetJustifyH("LEFT")
    frame.label:SetWordWrap(false)
    rowFrames[index] = frame
    return frame
end

--- Which buttons the player sees, and their texts.
local function updateButtons()
    local player, leader = VXV.PlayerName(), Invitations.Leader()
    local isOfficer = RaidData.IsOfficer(player)
    -- Anybody may load the first data: refused unless the website names them officer.
    buttons.import:SetShown(RaidData.Current() == nil or isOfficer)
    buttons.open:SetShown(isOfficer and (leader == nil or leader == player))
    buttons.open:SetText(leader == player and "Fermer les invitations" or "Ouvrir les invitations")
    buttons.inviteAll:SetShown(isOfficer)
    buttons.join:SetShown(leader ~= nil and leader ~= player)
end

local function render()
    local _, sender = RaidData.Text()
    local rows = RaidView.Rows({
        event = RaidData.Current(),
        player = VXV.PlayerName(),
        sender = sender,
        requests = Invitations.Requests(),
    })
    for index, data in ipairs(rows) do
        local frame = rowFrames[index] or newRow(index)
        frame.label:SetFontObject(FONTS[data.kind])
        frame.label:SetText(data.text)
        frame.tooltip, frame.invite = data.tooltip, data.invite
        frame:Show()
    end
    for index = #rows + 1, #rowFrames do
        rowFrames[index]:Hide()
    end
    list:SetHeight(#rows * ROW_HEIGHT)
    updateButtons()
end

local function addButton(text, onClick, point, x)
    local button = CreateFrame("Button", nil, content, "UIPanelButtonTemplate")
    button:SetSize(BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint(point, x, 0)
    button:SetText(text)
    button:SetScript("OnClick", onClick)
    return button
end

function RaidTab.Build(frame)
    content = frame
    local step = BUTTON_WIDTH + BUTTON_GAP
    buttons.import = addButton("Charger les données", Import.Open, "TOPLEFT", 0)
    buttons.open = addButton("Ouvrir les invitations", Invitations.Toggle, "TOPLEFT", step)
    buttons.inviteAll = addButton("Inviter tout le roster", Invitations.InviteAll, "TOPLEFT", 2 * step)
    buttons.join = addButton("Rejoindre le raid", Invitations.Join, "TOPRIGHT", 0)
    local scroll = CreateFrame("ScrollFrame", nil, content, "UIPanelScrollFrameTemplate")
    scroll:SetPoint("TOPLEFT", 0, -BUTTON_HEIGHT)
    scroll:SetPoint("BOTTOMRIGHT", -SCROLLBAR_WIDTH, 0)
    list = CreateFrame("Frame", nil, scroll)
    list:SetWidth(content:GetWidth() - SCROLLBAR_WIDTH)
    scroll:SetScrollChild(list)
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("raid.updated", refresh)
VXV.On("raid.invitations", refresh)
