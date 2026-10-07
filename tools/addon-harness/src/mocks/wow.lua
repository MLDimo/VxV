-- Generic mock of the WoW Forever client (Lua 5.1 API on fengari's Lua 5.3), for VXV_Core.
-- Chat output is silenced unless VXV_VERBOSE=1. Tests drive it through Fire and read ReportedErrors.
--- What the addon printed in the chat, for the tests.
Printed = {}
local writeToConsole = print
print = function(...)
    Printed[#Printed + 1] = table.concat({ ... }, " ")
    if os.getenv("VXV_VERBOSE") == "1" then
        writeToConsole(...)
    end
end

-- Lua 5.1 globals that Lua 5.3 moved or removed.
unpack = table.unpack
-- Date functions WoW keeps from the os library, which it removes. The test client lives in UTC, and its
-- time() follows the client's clock (Clock, below).
time = function(fields)
    if fields ~= nil then
        return os.time(fields)
    end
    return Clock.epoch + Clock.now
end
-- fengari reads "!" (UTC) for "*t" only: the UTC wall clock goes through a local time with the same fields.
date = function(format, seconds) return os.date(format, os.time(os.date("!*t", seconds or time()))) end
math.atan2 = math.atan2 or function(y, x) return math.atan(y, x) end

local frames = {}
--- Every event an addon subscribed to, for the tests.
RegisteredEvents = {}
--- Errors reported to the game's error handler (shown by BugSack in game).
ReportedErrors = {}

function Fire(event, ...)
    for _, frame in ipairs(frames) do
        if frame.events[event] and frame.scripts.OnEvent then
            frame.scripts.OnEvent(frame, event, ...)
        end
    end
end

--- Widgets of the client: frames, buttons, font strings and textures, with the methods VXV uses.
--- A method the client does not have raises a Lua error, as in game.
local function newRegion(kind)
    local region = { kind = kind, points = {}, shown = true, width = 0, height = 0 }
    function region:SetPoint(...)
        self.points[#self.points + 1] = { ... }
    end
    function region:ClearAllPoints()
        self.points = {}
    end
    function region:GetPoint()
        local first = self.points[1] or {}
        return table.unpack(first)
    end
    function region:SetSize(width, height)
        self.width, self.height = width, height
    end
    function region:SetWidth(width) self.width = width end
    function region:SetHeight(height) self.height = height end
    function region:GetWidth() return self.width end
    function region:GetHeight() return self.height end
    -- Like the game, a frame shown again runs its OnShow script.
    function region:Show()
        local hidden = not self.shown
        self.shown = true
        if hidden and self.scripts ~= nil and self.scripts.OnShow ~= nil then
            self.scripts.OnShow(self)
        end
    end
    function region:Hide() self.shown = false end
    function region:SetShown(shown)
        if shown then
            self:Show()
        else
            self:Hide()
        end
    end
    function region:IsShown() return self.shown end
    function region:SetAlpha(alpha) self.alpha = alpha end
    return region
end

local function newFontString()
    local fontString = newRegion("FontString")
    function fontString:SetText(text) self.text = text end
    function fontString:GetText() return self.text end
    function fontString:SetJustifyH(justify) self.justify = justify end
    function fontString:SetJustifyV(justify) self.justifyV = justify end
    function fontString:SetWordWrap(wrap) self.wordWrap = wrap end
    function fontString:SetFontObject(font) self.font = font end
    function fontString:SetFont(file, size, flags) self.font = file return true end
    function fontString:SetTextColor(r, g, b, a) self.color = { r, g, b, a } end
    --- About 7 pixels a character: enough to lay out.
    function fontString:GetStringWidth() return #tostring(self.text or "") * 7 end
    return fontString
end

local function newTexture()
    local texture = newRegion("Texture")
    function texture:SetTexture(path) self.path = path end
    function texture:SetAllPoints() end
    function texture:SetColorTexture(r, g, b, a) self.color = { r, g, b, a } end
    function texture:SetTexCoord(...) self.coords = { ... } end
    function texture:SetBlendMode(mode) self.blendMode = mode end
    function texture:SetVertexColor(r, g, b, a) self.vertexColor = { r, g, b, a } end
    --- Animations: the steps a group plays, in order, and whether it plays.
    function texture:CreateAnimationGroup()
        local group = { steps = {} }
        function group:CreateAnimation(kind)
            local step = { kind = kind }
            function step:SetOrder(order) self.order = order end
            function step:SetFromAlpha(alpha) self.from = alpha end
            function step:SetToAlpha(alpha) self.to = alpha end
            function step:SetDuration(seconds) self.duration = seconds end
            function step:SetSmoothing(smoothing) self.smoothing = smoothing end
            self.steps[#self.steps + 1] = step
            return step
        end
        function group:SetLooping(looping) self.looping = looping end
        function group:Play() self.playing = true end
        self.animation = group
        return group
    end
    return texture
end

function CreateFrame(kind, name, parent, template)
    local frame = newRegion(kind or "Frame")
    frame.events, frame.scripts, frame.name, frame.parent, frame.template = {}, {}, name, parent, template
    -- Like the game, a frame lies one level above its parent: it draws over it.
    local parentLevel = parent ~= nil and parent.frameLevel or 0
    frame.enabled, frame.frameLevel, frame.children = true, parentLevel + 1, {}
    function frame:RegisterEvent(event)
        self.events[event] = true
        RegisteredEvents[event] = true
    end
    function frame:UnregisterEvent(event)
        self.events[event] = nil
    end
    function frame:SetScript(script, handler) self.scripts[script] = handler end
    function frame:GetScript(script) return self.scripts[script] end
    function frame:SetFrameStrata(strata) self.strata = strata end
    function frame:SetFrameLevel(level) self.frameLevel = level end
    function frame:GetFrameLevel() return self.frameLevel end
    function frame:SetMovable(movable) self.movable = movable end
    function frame:SetClampedToScreen(clamped) self.clamped = clamped end
    function frame:EnableMouse(enabled) self.mouse = enabled end
    function frame:RegisterForDrag(...) self.dragButtons = { ... } end
    function frame:RegisterForClicks(...) self.clickButtons = { ... } end
    function frame:StartMoving() end
    function frame:StopMovingOrSizing() end
    function frame:CreateFontString(_, _, template)
        local fontString = newFontString()
        fontString.font, fontString.parent = template, self
        self.children[#self.children + 1] = fontString
        return fontString
    end
    function frame:CreateTexture()
        local texture = newTexture()
        texture.parent = self
        self.children[#self.children + 1] = texture
        return texture
    end
    function frame:SetText(text) self.text = text end
    function frame:GetText() return self.text end
    function frame:SetMultiLine(multiLine) self.multiLine = multiLine end
    function frame:SetMaxLetters(maxLetters) self.maxLetters = maxLetters end
    function frame:SetAutoFocus(autoFocus) self.autoFocus = autoFocus end
    function frame:SetFontObject(font) self.font = font end
    function frame:SetFocus() self.focused = true end
    function frame:HighlightText() self.highlighted = true end
    function frame:SetScrollChild(child) self.scrollChild = child end
    function frame:EnableMouseWheel(enabled) self.mouseWheel = enabled end
    function frame:SetVerticalScroll(offset) self.verticalScroll = offset end
    function frame:GetVerticalScroll() return self.verticalScroll or 0 end
    function frame:Enable() self.enabled = true end
    function frame:Disable() self.enabled = false end
    function frame:IsEnabled() return self.enabled end
    function frame:GetCenter() return self.centerX or 0, self.centerY or 0 end
    function frame:SetScale(scale) self.scale = scale end
    function frame:GetEffectiveScale() return 1 end
    --- Test helper: runs a script as the client would (a click, a drag, a frame update).
    function frame:Run(script, ...)
        if self.scripts[script] ~= nil then
            self.scripts[script](self, ...)
        end
    end
    frames[#frames + 1] = frame
    if name ~= nil then
        _G[name] = frame
    end
    if parent ~= nil and parent.children ~= nil then
        parent.children[#parent.children + 1] = frame
    end
    return frame
end

--- Test helper: the first widget under the frame, depth first, for which test(widget) is true.
function FindWidget(frame, test)
    for _, child in ipairs(frame.children or {}) do
        if test(child) then
            return child
        end
        local found = FindWidget(child, test)
        if found ~= nil then
            return found
        end
    end
end

--- Test helper: whether the widget and all its parents are shown.
function IsVisible(widget)
    while widget ~= nil do
        if not widget.shown then
            return false
        end
        widget = widget.parent
    end
    return true
end

--- Test helper: the charter's button (VXV.Theme.Button) showing this text under the frame.
function FindButton(frame, text)
    return FindWidget(frame, function(widget) return widget.label ~= nil and widget.label.text == text end)
end

function geterrorhandler()
    return function(message)
        ReportedErrors[#ReportedErrors + 1] = tostring(message)
    end
end

--- A value the client flags as secret (Midnight-era restriction), as returned for enemy names in combat.
SECRET = setmetatable({}, { __tostring = function() return "SECRET" end })
function issecretvalue(value)
    return value == SECRET
end

-- Interface the core uses: the screen, the minimap, the tooltip, the cursor, Escape-closable frames.
UIParent = CreateFrame("Frame", "UIParent")
UISpecialFrames = {}
SlashCmdList = {}
Minimap = CreateFrame("Frame", "Minimap", UIParent)
Minimap:SetSize(140, 140)
Minimap.centerX, Minimap.centerY = 1000, 700
GameTooltip = CreateFrame("Frame", "GameTooltip", UIParent)
GameTooltip.lines = {}
-- Like the game, a new owner starts an empty tooltip.
function GameTooltip:SetOwner(owner, anchor) self.owner, self.anchor, self.lines = owner, anchor, {} end
function GameTooltip:AddLine(text) self.lines[#self.lines + 1] = text end
function GameTooltip:SetHyperlink(link) self.link = link end
--- Where the cursor is, in screen pixels; tests move it.
Cursor = { x = 0, y = 0 }
function GetCursorPosition() return Cursor.x, Cursor.y end
--- Where the player is: GetInstanceInfo's name, type and instance id (outside any instance: the open world).
Instance = { name = "Kalimdor", type = "none", id = 1 }
function GetInstanceInfo()
    return Instance.name, Instance.type, 0, "", 0, 0, false, Instance.id
end
--- Whether the player is in combat; tests set it.
InCombat = false
function InCombatLockdown() return InCombat end

-- Time: the client's clock, in seconds, moved forward by the tests (AdvanceTime runs the timers due).
-- time() is epoch + now: at start, 10 December 2026 at 12:00 UTC, the day of the tests' raid.
Clock = { now = 1000, epoch = 1796903000 }
function GetTime()
    return Clock.now
end
local timers = {}
C_Timer = {
    After = function(seconds, callback)
        timers[#timers + 1] = { at = Clock.now + seconds, callback = callback }
    end,
}
function AdvanceTime(seconds)
    local target = Clock.now + seconds
    while true do
        table.sort(timers, function(left, right) return left.at < right.at end)
        local due = timers[1]
        if due == nil or due.at > target then
            break
        end
        table.remove(timers, 1)
        Clock.now = due.at
        due.callback()
    end
    Clock.now = target
end

-- Addon messages: what this client sent, for the tests to deliver to the other players' clients.
Enum = { SendAddonMessageResult = { Success = 0, AddonMessageThrottle = 3 }, TooltipDataType = { Item = 0, Unit = 2 } }
SentAddonMessages = {}
--- Messages longer than the 255 bytes the server carries (it would cut them silently).
OversizedMessages = {}
--- How many more messages the server accepts before answering "throttled"; nil for no limit.
ServerCredit = nil
--- True during a boss encounter: the client refuses addon messages.
ChatLockdown = false
C_ChatInfo = {
    RegisterAddonMessagePrefix = function() return 0 end,
    SendAddonMessage = function(prefix, text, channel, target)
        if #text > 255 then
            OversizedMessages[#OversizedMessages + 1] = text
        end
        if ServerCredit ~= nil then
            if ServerCredit <= 0 then
                return Enum.SendAddonMessageResult.AddonMessageThrottle
            end
            ServerCredit = ServerCredit - 1
        end
        SentAddonMessages[#SentAddonMessages + 1] = { prefix = prefix, text = text, channel = channel, target = target }
        return Enum.SendAddonMessageResult.Success
    end,
    InChatMessagingLockdown = function() return ChatLockdown end,
    SendChatMessage = function(text, chatType) ChatSent[#ChatSent + 1] = { text = text, channel = chatType } end,
}
--- Messages the player wrote in a chat channel: { text, channel }.
ChatSent = {}

--- Hands this client's sent messages to the test as hexadecimal (exact bytes), and forgets them.
function TakeSentMessages()
    local taken = {}
    for index, message in ipairs(SentAddonMessages) do
        taken[index] = {
            prefix = message.prefix,
            channel = message.channel,
            target = message.target,
            hex = (message.text:gsub(".", function(byte) return string.format("%02x", byte:byte()) end)),
        }
    end
    SentAddonMessages = {}
    return taken
end

function FromHex(hex)
    return (hex:gsub("%x%x", function(pair) return string.char(tonumber(pair, 16)) end))
end

-- The player of this client: an undead woman ("Scourge", sex 3) unless a test says otherwise.
--- The game's Lua 5.1: string.format takes strings and numbers only (fengari's Lua 5.3 would write "nil").
do
    local format = string.format
    string.format = function(pattern, ...)
        for index = 1, select("#", ...) do
            local kind = type((select(index, ...)))
            if kind ~= "string" and kind ~= "number" then
                error(("bad argument #%d to 'format' (string expected, got %s)"):format(index + 1, kind), 2)
            end
        end
        return format(pattern, ...)
    end
end

--- The game's counters (T8): the honorable kills, and the Statistics tab's values by id (a string, as the game
--- shows them; "--" for a counter never moved).
Counters = { honorableKills = 0, statistics = {} }
function GetPVPLifetimeStats() return Counters.honorableKills, 0, 0 end
function GetStatistic(id) return Counters.statistics[id] or "--" end

--- Items the client has in its cache: { [item id] = { name, classID, subclassID } }; nil for any other.
ItemInfo = {}
C_Item = {
    GetItemInfo = function(link)
        local info = ItemInfo[tonumber(link) or tonumber(tostring(link):match("item:(%d+)"))]
        if info == nil then
            return nil
        end
        return info.name, link, 1, 1, 1, "", "", 20, "", 0, 0, info.classID, info.subclassID
    end,
}

Player = { name = "Ðéjà Vu", inGuild = true, race = "Scourge", sex = 3, class = "ROGUE" }
function UnitRace(unit)
    if unit == "player" then
        return "Mort-vivant", Player.race, 5
    end
end
function UnitSex(unit)
    return unit == "player" and Player.sex or nil
end
--- The player's group, set by the tests: the other members' names, whether it is a raid, and who leads.
--- Raid units start with the player (raid1), party units are the others (party1 to party4).
Group = { members = {}, raid = false, leader = true }
--- Other units the tests name ("target", "mouseover"), by unit.
Units = {}
function GetUnitName(unit)
    if unit == "player" then
        return Player.name
    end
    if Units[unit] ~= nil then
        return Units[unit]
    end
    local kind, index = unit:match("^(%a+)(%d+)$")
    index = tonumber(index)
    if kind == "party" and not Group.raid then
        return Group.members[index]
    elseif kind == "raid" and Group.raid then
        return index == 1 and Player.name or Group.members[index - 1]
    end
end
function IsInGroup() return #Group.members > 0 end
function IsInRaid() return Group.raid end
function GetNumGroupMembers() return #Group.members > 0 and #Group.members + 1 or 0 end
function UnitIsGroupLeader(unit) return unit == "player" and Group.leader end
function UnitIsGroupAssistant() return false end
--- Invitations the player sent, in order, and how many times the group became a raid.
Invited = {}
ConvertedToRaid = 0
C_PartyInfo = {
    InviteUnit = function(name) Invited[#Invited + 1] = name end,
    ConvertToRaid = function()
        Group.raid = true
        ConvertedToRaid = ConvertedToRaid + 1
    end,
}
--- Loot: the master looter's name (nil without master loot), and the links of the items in the open corpse.
MasterLooter = nil
CorpseLinks = {}
--- A link as the client writes it.
function ItemLink(itemId, name) return "|cffa335ee|Hitem:" .. itemId .. "::::::::60:::::|h[" .. name .. "]|h|r" end
function GetNumLootItems() return #CorpseLinks end
function GetLootSlotLink(slot) return CorpseLinks[slot] end
function IsMasterLooter() return MasterLooter ~= nil and MasterLooter == Player.name end
--- Master loot: the party index (0 for the player) and the raid index (raid1 is the player) of the master looter.
C_PartyInfo.GetLootMethod = function()
    if MasterLooter == nil then
        return 0
    end
    local partyIndex = MasterLooter == Player.name and 0 or nil
    for index, name in ipairs(Group.members) do
        if name == MasterLooter then
            partyIndex = index
        end
    end
    return 2, partyIndex, Group.raid and partyIndex ~= nil and partyIndex + 1 or nil
end
--- Master loot candidates of the open corpse, by index, and the items given: { slot, name }.
LootCandidates = {}
Given = {}
function GetMasterLootCandidate(_, index) return LootCandidates[index] end
function GiveMasterLoot(slot, index) Given[#Given + 1] = { slot = slot, name = LootCandidates[index] } end
--- The game's damage meter: its combat sessions by id, set by the tests as { [meter type] = { [name] = amount } };
--- names and amounts are secret in combat, as on Forever.
MeterSessions = {}
C_DamageMeter = {
    GetAvailableCombatSessions = function()
        local list = {}
        for id in pairs(MeterSessions) do
            list[#list + 1] = { sessionID = id, name = "Combat", durationSeconds = 30 }
        end
        return list
    end,
    GetCombatSessionFromID = function(id, meterType)
        local sources = {}
        for name, amount in pairs((MeterSessions[id] or {})[meterType] or {}) do
            sources[#sources + 1] = InCombat and { name = SECRET, totalAmount = SECRET }
                or { name = name, totalAmount = amount }
        end
        return { combatSources = sources }
    end,
}

--- Dead players, by name; tests set it.
Dead = {}
function UnitIsDeadOrGhost(unit) return Dead[GetUnitName(unit) or ""] == true end
--- A secure hook runs after the original function, with its arguments, and changes nothing of its results.
function hooksecurefunc(name, hook)
    local original = _G[name]
    _G[name] = function(...)
        local results = { original(...) }
        hook(...)
        return unpack(results)
    end
end
--- /roll: the game's format of the result, and the rolls the player asked for: { low, high }.
RANDOM_ROLL_RESULT = "%s obtient un %d (%d-%d)."
Rolled = {}
function RandomRoll(low, high) Rolled[#Rolled + 1] = { low = low, high = high } end
--- Test helper: these players accepted the invitation; the client tells the addons.
function JoinGroup(...)
    for _, name in ipairs({ ... }) do
        Group.members[#Group.members + 1] = name
    end
    Fire("GROUP_ROSTER_UPDATE")
end
function IsInGuild()
    return Player.inGuild
end

-- The player's guild: its name as the client reports it (known = false until the first roster update), and
-- its members ({ name, class }). C_GuildInfo.GuildRoster only counts requests: tests fire GUILD_ROSTER_UPDATE.
GuildInfo = { name = "VXV", known = true }
MockGuildMembers = {}
GuildRosterRequests = 0
function GetGuildInfo(unit)
    if unit == "player" and Player.inGuild and GuildInfo.known then
        return GuildInfo.name, "Membre", 3
    end
end
C_GuildInfo = {
    GuildRoster = function()
        GuildRosterRequests = GuildRosterRequests + 1
    end,
}
function GetNumGuildMembers()
    return #MockGuildMembers, #MockGuildMembers
end
function GetGuildRosterInfo(index)
    local member = MockGuildMembers[index]
    return member.name, "Membre", 3, 60, "Classe", "", "", "", member.online ~= false, 0, member.class
end
ChatFontNormal = {}
--- The game's font object, whose fonts write each alphabet; and the font families made from fonts.
GameFontNormal = {
    GetFontObjectForAlphabet = function(_, alphabet)
        return { GetFont = function() return "Fonts\\" .. alphabet .. ".ttf" end }
    end,
}
FontFamilies = {}
function CreateFontFamily(name, members)
    FontFamilies[name] = members
    return { name = name, members = members }
end

-- Showing a title (phase 0, T9). Tooltips: the post-calls by data type; UnitTooltip(unit) shows the unit's
-- tooltip and returns the lines the post-calls added.
local tooltipPostCalls = {}
TooltipDataProcessor = {
    AddTooltipPostCall = function(dataType, callback)
        tooltipPostCalls[#tooltipPostCalls + 1] = { dataType = dataType, callback = callback }
    end,
}
function UnitTooltip(unit)
    local lines = {}
    local tooltip = {
        GetUnit = function() return GetUnitName(unit), unit end,
        AddLine = function(_, text) lines[#lines + 1] = text end,
    }
    for _, postCall in ipairs(tooltipPostCalls) do
        if postCall.dataType == Enum.TooltipDataType.Unit then
            postCall.callback(tooltip)
        end
    end
    return lines
end
--- ItemTooltip(item id) shows the item's tooltip and returns the lines the post-calls added: { text, r, g, b }.
function ItemTooltip(itemId)
    local lines = {}
    local tooltip = {
        AddLine = function(_, text, r, g, b) lines[#lines + 1] = { text = text, r = r, g = g, b = b } end,
    }
    for _, postCall in ipairs(tooltipPostCalls) do
        if postCall.dataType == Enum.TooltipDataType.Item then
            postCall.callback(tooltip, { id = itemId })
        end
    end
    return lines
end
-- The chat's message filters by event; ChatShows(event, text, author) returns the text the chat shows, or nil when
-- a filter hides the message.
local chatFilters = {}
ChatFrameUtil = {
    AddMessageEventFilter = function(event, filter)
        chatFilters[event] = chatFilters[event] or {}
        table.insert(chatFilters[event], filter)
    end,
}
function ChatShows(event, text, author)
    for _, filter in ipairs(chatFilters[event] or {}) do
        local hidden, newText, newAuthor = filter({}, event, text, author)
        if hidden then
            return nil
        end
        if newText ~= nil then
            text, author = newText, newAuthor
        end
    end
    return text
end
-- The guild window (Blizzard_Communities, loaded at login on Forever) and its list; GuildRowShows(name) fills a new
-- row with a member's name and returns the name the row shows.
local rowCallbacks = {}
CommunitiesFrame = { MemberList = { ScrollBox = {} } }
ScrollUtil = {
    AddInitializedFrameCallback = function(scrollBox, callback, owner)
        if scrollBox == CommunitiesFrame.MemberList.ScrollBox then
            rowCallbacks[#rowCallbacks + 1] = { callback = callback, owner = owner }
        end
    end,
}
function GuildRowShows(name)
    local text = name
    local row = { NameFrame = { Name = {
        GetText = function() return text end,
        SetText = function(_, value) text = value end,
    } } }
    for _, hook in ipairs(rowCallbacks) do
        hook.callback(hook.owner, row)
    end
    return text
end

--- The player's class: localized name, token and id.
function UnitClass(unit)
    if unit == "player" then
        return "Voleur", Player.class, 4
    end
end
-- Professions (phase 0, T10), set by the tests: { { id, name, level, max, recipes = { [id] = { name, learned } } } },
-- the list's five slots in order; ShownProfession is the profession whose window is open.
Professions = {}
ShownProfession = nil
local PROFESSION_SLOTS = 5
function GetProfessions()
    local slots = {}
    for index = 1, PROFESSION_SLOTS do
        slots[index] = Professions[index] and index or nil
    end
    return unpack(slots, 1, PROFESSION_SLOTS)
end
function GetProfessionInfo(index)
    local profession = Professions[index]
    return profession.name, 0, profession.level, profession.max, 0, 0, profession.id
end
C_TradeSkillUI = {
    GetBaseProfessionInfo = function()
        local shown = ShownProfession
        return shown and { professionID = shown.id, professionName = shown.name, skillLevel = shown.level,
            maxSkillLevel = shown.max }
    end,
    GetAllRecipeIDs = function()
        local ids = {}
        for id in pairs(ShownProfession and ShownProfession.recipes or {}) do
            ids[#ids + 1] = id
        end
        table.sort(ids)
        return ids
    end,
    GetRecipeInfo = function(id)
        local recipe = ShownProfession and ShownProfession.recipes[id]
        return recipe and { recipeID = id, name = recipe.name, learned = recipe.learned }
    end,
}
