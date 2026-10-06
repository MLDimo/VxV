local _, ns = ...

--- The data the website exports for a bundle (VXV-PARIS, VXV-QUETES, VXV-TITRES): one record per line, brought by
--- the player's companion (VXV_Sync's inbox) or passed on by the officers' addons (SharedData.lua), and kept in the
--- module's saved data with who sent them. Every format starts with the same lines: P;export (Unix seconds),
--- O;officer character (the addon takes the data from them only), M;member id;character of the member.
local SiteData = {}
ns.SiteData = SiteData

local Bus, Names, SharedData = ns.Bus, ns.Names, ns.SharedData

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

--- A bundle's data. Options: name ("quetes": the companion's inbox field, the guild's messages, and the event
--- "quetes.updated" (data) after each change), header ("VXV-QUETES-1"), New() (the bundle's part of empty data),
--- lines ({ [kind] = { number of fields, add(data, fields), false when a value is wrong } }), shared (false: data too
--- big for the officers to pass them on, brought by the companion only).
--- Returns { Parse(text), Restore(saved data), Text(), ExportedAt(), Current(), IsOfficer(name), FromCompanion(text) }.
function SiteData.Create(options)
    local store = {}
    local saved, current = {}, nil

    --- The data read from the website's text, or nil when it is not data of this format.
    function store.Parse(text)
        if type(text) ~= "string" then
            return nil
        end
        local data = options.New()
        data.officers, data.members = {}, {}
        local headerSeen = false
        for raw in (text .. "\n"):gmatch("([^\n]*)\n") do
            local line = raw:match("^%s*(.-)%s*$")
            if line ~= "" then
                if not headerSeen then
                    if line ~= options.header then
                        return nil
                    end
                    headerSeen = true
                else
                    local f = fields(line)
                    local kind = table.remove(f, 1)
                    local rule = options.lines[kind] or COMMON_LINES[kind]
                    -- A kind of line a newer website adds is left aside.
                    if rule ~= nil and (#f < rule[1] or not rule[2](data, f)) then
                        return nil
                    end
                end
            end
        end
        return headerSeen and data.exportedAt ~= nil and data or nil
    end

    --- The text of the data, as the website wrote it.
    function store.Text()
        return saved.text
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
        saved.text, saved.sender, current = text, sender, data
        Bus.Emit(options.name .. ".updated", data)
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

    local sharing = options.shared ~= false and SharedData.Create(options.name, {
        Text = store.Text,
        ExportedAt = store.ExportedAt,
        IsOfficer = store.IsOfficer,
        -- Data an addon of the guild sent: kept when newer and sent by an officer the data name; refusals stay silent.
        Receive = function(text, sender)
            local data = store.Parse(text)
            if data ~= nil and SharedData.Accepts(data, current, sender) then
                keep(text, data, sender)
            end
        end,
    })

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
