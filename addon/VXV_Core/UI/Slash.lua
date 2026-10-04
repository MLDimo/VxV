local _, ns = ...

--- /vxv: opens the window; "/vxv aide" lists the commands that the core and the modules add.
local Slash = {}
ns.Slash = Slash

local Chat, Window = ns.Chat, ns.Window

local commands = {}

--- Adds "/vxv <name>"; usage describes it in the help.
function Slash.Register(name, usage, run)
    commands[name] = { usage = usage, run = run }
end

local function help()
    Chat.Print("/vxv : ouvrir ou fermer la fenêtre")
    local names = {}
    for name in pairs(commands) do
        names[#names + 1] = name
    end
    table.sort(names)
    for _, name in ipairs(names) do
        Chat.Print(string.format("/vxv %s : %s", name, commands[name].usage))
    end
end

SLASH_VXV1 = "/vxv"
SlashCmdList.VXV = function(input)
    local name, rest = (input or ""):match("^%s*(%S*)%s*(.-)%s*$")
    local command = commands[name:lower()]
    if name == "" then
        Window.Toggle()
    elseif command ~= nil then
        command.run(rest)
    else
        help()
    end
end

Slash.Register("aide", "afficher ces commandes", help)
