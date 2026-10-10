local ns = select(2, ...).Core

--- The data the website exports for a part (VXV-RAID, VXV-PARIS, VXV-QUETES…): one record per line, brought by
--- the player's companion (the Sync part's inbox), pasted by an officer, or passed on by the officers' addons
--- (SharedData.lua), and kept in the module's saved data with who sent them. Every format may use the same lines:
--- P;export (Unix seconds), O;officer character (the addon takes the data from them only), M;member id;character of
--- the member.
local SiteData = {}
ns.SiteData = SiteData

local Bus, Names, SharedData = ns.Bus, ns.Names, ns.SharedData

local NOT_DATA = "Ce texte n'est pas une donnée du site : copie-la depuis le site."
local UNREADABLE_LINE = "Ligne %d illisible : recopie les données depuis le site."
local NOT_OFFICER = "Seuls les officiers chargent les données, et ce personnage n'est pas lié à un officier "
    .. "sur le site."
local ALREADY_LOADED = "Ces données sont déjà chargées."
local OLDER = "Tu as déjà des données plus récentes (copiées le %s)."
local DATE_TIME = "%d/%m %H:%M"

local COMMON_LINES = {
    P = { 1, function(data, f)
        data.exportedAt = tonumber(f[1])
        return data.exportedAt ~= nil
    end },
    O = { 1, function(data, f)
        data.officers[f[1]] = true
        return true
    end },
    M = { 2, function(data, f)
        data.members[f[2]] = f[1]
        return true
    end },
}

local function fields(line)
    local result = {}
    for field in (line .. ";"):gmatch("([^;]*);") do
        result[#result + 1] = field
    end
    return result
end

--- The website's id of the member playing the character "Prénom Nom" (the player's by default), from the data's M
--- lines; nil without data or for a character linked to nobody.
function SiteData.MemberOf(data, name)
    return data ~= nil and data.members[name or Names.OfUnit("player") or ""] or nil
end

--- A part's data. Options: name ("quetes": the companion's inbox field, the guild's messages, and the event
--- "quetes.updated" (data, previous data, sender) after each change), header ("VXV-QUETES-1"), wrong (why a text of
--- another kind is refused, for an officer's import), New() (the part's part of empty data), lines ({ [kind] =
--- { least number of fields, add(data, fields): false when a value is wrong } }; a line sets data.exportedAt, the P
--- line by default), shared (false: data too big for the officers to pass them on, brought by the companion only).
--- Returns { Parse, Restore, Text, ExportedAt, Current, IsOfficer, FromCompanion, Receive, Import }.
function SiteData.Create(options)
    local store = {}
    local saved, current = {}, nil

    --- The data read from the website's text; nil and why (in French) when it is not readable data of this format.
    --- Lines of a kind a newer website adds are left aside.
    function store.Parse(text)
        if type(text) ~= "string" then
            return nil, options.wrong or NOT_DATA
        end
        local data = options.New()
        data.officers, data.members = {}, {}
        local number, headerSeen = 0, false
        for raw in (text .. "\n"):gmatch("([^\n]*)\n") do
            number = number + 1
            local line = raw:match("^%s*(.-)%s*$")
            if line ~= "" and not headerSeen then
                if line ~= options.header then
                    return nil, options.wrong or NOT_DATA
                end
                headerSeen = true
            elseif line ~= "" then
                local f = fields(line)
                local kind = table.remove(f, 1)
                local rule = options.lines[kind] or COMMON_LINES[kind]
                if rule ~= nil and (#f < rule[1] or not rule[2](data, f)) then
                    return nil, UNREADABLE_LINE:format(number)
                end
            end
        end
        if not headerSeen or data.exportedAt == nil then
            return nil, options.wrong or NOT_DATA
        end
        return data
    end

    --- The text of the data, as the website wrote it, and who sent it (nil: the player's companion).
    function store.Text()
        return saved.text, saved.sender
    end

    --- When the data were exported by the website (Unix seconds), 0 without data.
    function store.ExportedAt()
        return current and current.exportedAt or 0
    end

    --- The data, or nil before the companion or an officer brought any.
    function store.Current()
        return current
    end

    --- True when the character named "Prénom Nom" belongs to an officer, according to the data.
    function store.IsOfficer(name)
        return current ~= nil and name ~= nil and current.officers[name] == true
    end

    local function keep(text, data, sender)
        local previous = current
        saved.text, saved.sender, current = text, sender, data
        Bus.Emit(options.name .. ".updated", data, previous, sender)
    end

    --- Data brought by the player's own companion: kept when newer, since the player's computer wrote them.
    function store.FromCompanion(text)
        local data = store.Parse(text)
        if data == nil or (current ~= nil and data.exportedAt <= current.exportedAt) then
            return false
        end
        keep(text, data, nil)
        return true
    end

    --- Data an addon of the guild sent: kept when newer and sent by an officer the data name (in both the new and the
    --- current data). Refusals stay silent. True when kept.
    function store.Receive(text, sender)
        local data = store.Parse(text)
        if data == nil or not SharedData.Accepts(data, current, sender) then
            return false
        end
        keep(text, data, sender)
        return true
    end

    local sharing = options.shared ~= false and SharedData.Create(options.name, {
        Text = store.Text,
        ExportedAt = store.ExportedAt,
        IsOfficer = store.IsOfficer,
        Receive = store.Receive,
    })

    --- An officer pastes the website's text: kept, then passed on to the guild; true, or false and why it is refused.
    function store.Import(text)
        local data, problem = store.Parse(text)
        if data == nil then
            return false, problem
        end
        local me = Names.OfUnit("player")
        if not data.officers[me or ""] then
            return false, NOT_OFFICER
        end
        if current ~= nil and data.exportedAt <= current.exportedAt then
            return false, data.exportedAt == current.exportedAt and ALREADY_LOADED
                or OLDER:format(date(DATE_TIME, current.exportedAt))
        end
        keep(text, data, me)
        if sharing then
            sharing.Send()
        end
        return true
    end

    --- Takes the module's saved data at start-up, reads them, and asks the guild's officers for newer ones.
    function store.Restore(data)
        saved = data
        current = store.Parse(data.text)
        if sharing then
            sharing.Start()
        end
    end

    -- What the player's companion brought: kept when newer, then passed on to the guild by an officer.
    Bus.On("sync.inbox", function(inbox)
        if store.FromCompanion(inbox[options.name]) and sharing and store.IsOfficer(Names.OfUnit("player")) then
            sharing.Send()
        end
    end)

    return store
end
