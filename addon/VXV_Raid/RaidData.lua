local _, ns = ...

--- The event shown in the Raid tab: loaded by an officer from the website's text, passed on to the guild, and
--- kept in the saved data with who sent it. The text names the officers; only their characters may send it.
local RaidData = {}
ns.RaidData = RaidData

local EventData, Labels = ns.EventData, ns.Labels

local NOT_OFFICER = "Seuls les officiers chargent les données, et ce personnage n'est pas lié à un officier "
    .. "sur le site."
local ALREADY_LOADED = "Ces données sont déjà chargées."
local OLDER = "Tu as déjà des données plus récentes (copiées le %s)."
local LOADED = "Données chargées : %s, le %s."
-- Players' clocks may be wrong: data dated further in the future would block every later update.
local CLOCK_TOLERANCE_SECONDS = 24 * 60 * 60

local saved = {}
local current

--- Takes the module's saved data at start-up and reads the event kept in it.
function RaidData.Restore(data)
    saved = data
    current = EventData.Parse(data.text)
end

--- The text of the current event, as the website wrote it, and who sent it.
function RaidData.Text()
    return saved.text, saved.sender
end

--- When the current event was copied from the website (Unix seconds), 0 without event.
function RaidData.ExportedAt()
    return current and current.exportedAt or 0
end

--- The current event, or nil when no officer loaded any.
function RaidData.Current()
    return current
end

--- True when the character named "Prénom Nom" belongs to an officer, according to the current event.
function RaidData.IsOfficer(name)
    return current ~= nil and name ~= nil and current.officers[name] == true
end

--- Why the newer event would not replace the current one, or nil.
local function staleness(event)
    if current == nil or event.exportedAt > current.exportedAt then
        return nil
    end
    return event.exportedAt == current.exportedAt and ALREADY_LOADED or OLDER:format(
        Labels.DateTime(current.exportedAt))
end

--- Keeps the event, then tells the bundle ("raid.updated", event, previous event, sender).
local function keep(text, event, sender)
    local previous = current
    saved.text, saved.sender, current = text, sender, event
    VXV.Emit("raid.updated", event, previous, sender)
end

--- An officer pastes the website's text: true and a message, or false and why it is refused.
function RaidData.Import(text)
    local event, problem = EventData.Parse(text)
    if event == nil then
        return false, problem
    end
    if not event.officers[VXV.PlayerName() or ""] then
        return false, NOT_OFFICER
    end
    local refusal = staleness(event)
    if refusal ~= nil then
        return false, refusal
    end
    keep(text, event, VXV.PlayerName())
    return true, LOADED:format(event.title, Labels.DateTime(event.startsAt))
end

--- Data an addon of the guild sent, kept when they are newer and their sender is an officer for both the new
--- and the current data (the new ones only, for a member who has none yet). Refusals stay silent.
function RaidData.Receive(text, sender)
    local event = EventData.Parse(text)
    if event == nil or sender == nil or not event.officers[sender] then
        return false
    end
    if (current ~= nil and not current.officers[sender]) or event.exportedAt > time() + CLOCK_TOLERANCE_SECONDS then
        return false
    end
    if staleness(event) ~= nil then
        return false
    end
    keep(text, event, sender)
    return true
end
