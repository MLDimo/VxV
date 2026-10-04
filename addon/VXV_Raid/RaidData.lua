local _, ns = ...

--- The event shown in the Raid tab: loaded by an officer from the website's text, then kept in the saved data.
--- The text names the officers; only their characters may load it.
local RaidData = {}
ns.RaidData = RaidData

local EventData, Labels = ns.EventData, ns.Labels

local NOT_OFFICER = "Seuls les officiers chargent les données, et ce personnage n'est pas lié à un officier "
    .. "sur le site."
local ALREADY_LOADED = "Ces données sont déjà chargées."
local OLDER = "Tu as déjà des données plus récentes (copiées le %s)."
local LOADED = "Données chargées : %s, le %s."

local saved = {}
local current

--- Takes the module's saved data at start-up and reads the event kept in it.
function RaidData.Restore(data)
    saved = data
    current = EventData.Parse(data.text)
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
    saved.text, current = text, event
    VXV.Emit("raid.updated", event)
    return true, LOADED:format(event.title, Labels.DateTime(event.startsAt))
end
