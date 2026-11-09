local ns = select(2, ...).Core

--- The member to challenge in Le Dé Pipé's games (owner's request of 9 November): a field to search a name, accents
--- and case aside, then the members connected with VXV but the player, the one chosen in gold.
local MemberPicker = {}
ns.MemberPicker = MemberPicker

local Names, Presence, RowList, Search, Theme = ns.Names, ns.Presence, ns.RowList, ns.Search, ns.Theme

local MAX_LETTERS = 40
local GAP = 6
local HINT_MARGIN = 8
local NOBODY = "Aucun autre membre connecté avec VXV."
local NO_MATCH = "Aucun membre connecté ne correspond."

local row = RowList.Row

--- Creates the picker over the parent's width, its list down to bottomOffset; returns { Selected(), Refresh() }.
function MemberPicker.Create(parent, bottomOffset)
    local picker, chosen = {}, nil
    local holder, field = Theme.Field(parent, parent:GetWidth(), MAX_LETTERS)
    holder:SetPoint("TOPLEFT")
    local hint = Theme.Text(holder, "text", 12, "muted")
    hint:SetPoint("LEFT", HINT_MARGIN, 0)
    hint:SetText("Rechercher un membre…")
    local list = RowList.Create(parent, holder:GetHeight() + GAP, nil, bottomOffset)

    local function rows()
        local search, me, found = field:GetText() or "", Names.OfUnit("player"), {}
        for _, name in ipairs(Presence.Online()) do
            if name ~= me and (search:match("^%s*$") or Search.Matches(search, name)) then
                found[#found + 1] = row("line", name == chosen and Theme.Colored("» " .. name, "gold") or name,
                    { onClick = function()
                        chosen = name
                        picker.Refresh()
                    end })
            end
        end
        return #found > 0 and found or { row("line", search:match("^%s*$") and NOBODY or NO_MATCH) }
    end

    --- The member chosen, or nil.
    function picker.Selected()
        return chosen
    end

    --- Lists the members again: those connected now, matching the search.
    function picker.Refresh()
        hint:SetShown((field:GetText() or "") == "")
        list.SetRows(rows())
    end

    field:SetScript("OnTextChanged", picker.Refresh)
    return picker
end
