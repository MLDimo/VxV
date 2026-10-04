local _, ns = ...

--- The Raid tab: the event's rows, a click on the requests to invite, and the buttons: load the data, open the
--- invitations, invite everyone (officers), join.
local RaidTab = {}
ns.RaidTab = RaidTab

local Import, Invitations, RaidData, RaidView = ns.Import, ns.Invitations, ns.RaidData, ns.RaidView
local RowList = ns.RowList

local BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_GAP = 150, 22, 4

local content, list
local buttons = {}

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
    for _, row in ipairs(rows) do
        if row.invite ~= nil then
            row.onClick = function()
                Invitations.Invite(row.invite)
            end
        end
    end
    list.SetRows(rows)
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
    list = RowList.Create(content, BUTTON_HEIGHT)
    render()
end

local function refresh()
    if content ~= nil then
        render()
    end
end

VXV.On("raid.updated", refresh)
VXV.On("raid.invitations", refresh)
