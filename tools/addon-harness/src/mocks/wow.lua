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
    function region:Show() self.shown = true end
    function region:Hide() self.shown = false end
    function region:SetShown(shown) self.shown = shown end
    function region:IsShown() return self.shown end
    return region
end

local function newFontString()
    local fontString = newRegion("FontString")
    function fontString:SetText(text) self.text = text end
    function fontString:GetText() return self.text end
    function fontString:SetJustifyH(justify) self.justify = justify end
    return fontString
end

local function newTexture()
    local texture = newRegion("Texture")
    function texture:SetTexture(path) self.path = path end
    function texture:SetAllPoints() end
    return texture
end

function CreateFrame(kind, name, parent, template)
    local frame = newRegion(kind or "Frame")
    frame.events, frame.scripts, frame.name, frame.parent, frame.template = {}, {}, name, parent, template
    frame.enabled, frame.frameLevel, frame.children = true, 1, {}
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
    function frame:CreateFontString()
        local fontString = newFontString()
        self.children[#self.children + 1] = fontString
        return fontString
    end
    function frame:CreateTexture()
        local texture = newTexture()
        self.children[#self.children + 1] = texture
        return texture
    end
    function frame:SetText(text) self.text = text end
    function frame:GetText() return self.text end
    function frame:Enable() self.enabled = true end
    function frame:Disable() self.enabled = false end
    function frame:IsEnabled() return self.enabled end
    function frame:GetCenter() return self.centerX or 0, self.centerY or 0 end
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
function GameTooltip:SetOwner(owner) self.owner = owner end
function GameTooltip:AddLine(text) self.lines[#self.lines + 1] = text end
--- Where the cursor is, in screen pixels; tests move it.
Cursor = { x = 0, y = 0 }
function GetCursorPosition() return Cursor.x, Cursor.y end
--- Whether the player is in combat; tests set it.
InCombat = false
function InCombatLockdown() return InCombat end
