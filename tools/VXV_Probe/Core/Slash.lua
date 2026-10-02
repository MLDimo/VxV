local _, ns = ...

--- /vxvtest: built-in journal commands, then "/vxvtest <test> <command> [args]".
local Log, Registry, Util = ns.Log, ns.Registry, ns.Util

local DEFAULT_LOG_LINES = 20

local function printTestHelp(test)
    print(string.format("  |cff14b8a6%s|r : %s", test.id, test.description))
    for _, command in ipairs(test.commands) do
        print(string.format("    /vxvtest %s %s %s", test.id, command.name, command.usage or ""))
    end
end

local function printHelp()
    print("|cff14b8a6VXV_Probe|r : /vxvtest log [n] | report | clear | verbose")
    for _, test in ipairs(Registry.All()) do
        printTestHelp(test)
    end
end

local function buildReport()
    local version, build, _, interface = GetBuildInfo()
    local lines = { string.format("VXV_Probe - client %s build %s - interface %s - export du %s",
        version, build, interface, Util.FormatTime(time())) }
    for _, entry in ipairs(Log.Entries()) do
        lines[#lines + 1] = Log.Format(entry, false)
    end
    return table.concat(lines, "\n")
end

local BUILTINS = {
    log = function(args)
        local entries = Log.Entries()
        local count = tonumber(args) or DEFAULT_LOG_LINES
        for index = math.max(1, #entries - count + 1), #entries do
            print(Log.Format(entries[index], true))
        end
    end,
    report = function()
        ns.Report.Show(buildReport())
    end,
    clear = function()
        Log.Clear()
        print("VXV_Probe : journal vidé.")
    end,
    verbose = function()
        print("VXV_Probe : mode détaillé " .. (Log.ToggleVerbose() and "activé" or "désactivé") .. ".")
    end,
}

SLASH_VXVPROBE1 = "/vxvtest"
SlashCmdList.VXVPROBE = function(input)
    local first, rest = Util.SplitFirst(input)
    first = first:lower()

    local builtin = BUILTINS[first]
    if builtin then
        return builtin(rest)
    end

    local test = Registry.Get(first)
    if not test then
        return printHelp()
    end

    local commandName, args = Util.SplitFirst(rest)
    local command = Registry.FindCommand(test, commandName:lower())
    if not command then
        return printTestHelp(test)
    end
    command.run(args)
end
