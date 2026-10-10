local ns = select(2, ...).Raid

--- The Raid tab of the reduced mode (§7.8): the alert when the player reserved an item of the next boss, that
--- boss's loot as cards, and where the raid stands at the bottom.
local RaidCompact = {}
ns.RaidCompact = RaidCompact

local CompactView, Group, NextBoss, RaidData = ns.CompactView, ns.Group, ns.NextBoss, ns.RaidData
local RaidLog, Raids, RowList = ns.RaidLog, ns.Raids, VXV.RowList

local Screen, Theme = VXV.Screen, VXV.Theme

local PADDING = 10
local ALERT_HEIGHT, ALERT_RING = 62, 2
local KICKER_HEIGHT = 26
local FOOTER_HEIGHT = 34

local content, alert, kicker, body, list, footer

local function render()
    local event, player = RaidData.Current(), VXV.PlayerName()
    local raid = Raids.Current()
    local log = RaidLog.Current()
    local boss, fallen = nil, 0
    if raid ~= nil then
        boss, fallen = Raids.Progress(raid, log and log.kills or {})
    end
    local warning = NextBoss.Warning(event, player, boss)
    alert:SetShown(warning ~= nil)
    if warning ~= nil then
        alert.title:SetText(warning.title)
        alert.text:SetText(warning.text)
    end
    local top = warning ~= nil and ALERT_HEIGHT + PADDING or 0
    local heading, rows = CompactView.Loot(event, player, raid, boss)
    kicker:ClearAllPoints()
    kicker:SetPoint("TOPLEFT", PADDING, -(PADDING + top))
    kicker:SetText(heading)
    body:ClearAllPoints()
    body:SetPoint("TOPLEFT", PADDING, -(PADDING + top + KICKER_HEIGHT))
    list.SetRows(rows)
    local inGroup = 0
    for _ in pairs(Group.Names()) do
        inGroup = inGroup + 1
    end
    local progress, origin = CompactView.Footer(event, raid, fallen, inGroup)
    footer.progress:SetText(progress)
    footer.origin:SetText(origin)
end

local function addAlert()
    alert = CreateFrame("Frame", nil, content)
    alert:SetPoint("TOPLEFT", PADDING, -PADDING)
    alert:SetSize(content:GetWidth() - 2 * PADDING, ALERT_HEIGHT)
    Theme.Fill(alert, "alert"):SetAllPoints()
    Theme.Rings(alert, { { "gold", ALERT_RING } }, true)
    alert.title = Theme.Text(alert, "pixelBold", 15, "gold")
    alert.title:SetPoint("TOPLEFT", PADDING + 4, -12)
    alert.text = Theme.Text(alert, "text", 13, "ivory")
    alert.text:SetPoint("TOPLEFT", alert.title, "BOTTOMLEFT", 0, -6)
    alert.text:SetPoint("RIGHT", -PADDING, 0)
    alert.text:SetWordWrap(false)
end

local function addFooter()
    footer = CreateFrame("Frame", nil, content)
    footer:SetPoint("BOTTOMLEFT", PADDING, PADDING)
    footer:SetSize(content:GetWidth() - 2 * PADDING, FOOTER_HEIGHT)
    Theme.Fill(footer, "wood-night"):SetAllPoints()
    footer.progress = Theme.Text(footer, "text", 13, "old-paper")
    footer.progress:SetPoint("LEFT", PADDING, 0)
    footer.origin = Theme.Text(footer, "text", 13, "old-paper")
    footer.origin:SetPoint("RIGHT", -PADDING, 0)
    footer.origin:SetJustifyH("RIGHT")
end

function RaidCompact.Build(frame)
    content = frame
    addAlert()
    kicker = Theme.Text(content, "pixel", 14, "sakura")
    addFooter()
    -- The list keeps the room of the alert: it only moves up when there is none.
    body = CreateFrame("Frame", nil, content)
    body:SetSize(content:GetWidth() - 2 * PADDING,
        content:GetHeight() - 3 * PADDING - ALERT_HEIGHT - KICKER_HEIGHT - FOOTER_HEIGHT - PADDING)
    list = RowList.Create(body)
    -- Entering the raid's instance changes the next boss: it is read again each time the tab shows.
    Screen.Follow(content, render, { "raid.updated", "raid.log", "raid.place" })
    VXV.OnEvent("GROUP_ROSTER_UPDATE", render)
end
