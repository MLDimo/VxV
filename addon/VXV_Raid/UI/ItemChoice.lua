local _, ns = ...

--- A dialog to choose items among the event's loot (P7.5), boss by boss: the player's soft reserves within their
--- allowance, or the items an officer excludes, with the reason the journal keeps. Clicking an item chooses it or
--- not; the game's tooltip shows it.
local ItemChoice = {}
ns.ItemChoice = ItemChoice

local RowList = ns.RowList

local Theme = VXV.Theme

local WIDTH, HEIGHT = 440, 500
local FOOTER_HEIGHT, FIELD_HEIGHT, FIELD_PADDING, BUTTON_WIDTH, BUTTON_HEIGHT = 92, 26, 6, 160, 30
local REASON_LETTERS = 200
local OVER_ALLOWANCE = "Tu as droit à %s."
local NO_REASON = "Le motif est obligatoire : il apparaîtra dans le journal."
local NO_LOOT = "Les données de ce raid manquent : mets l'addon VXV à jour."

local frame, list, counter, reasonHolder, reasonBox, problem
local options, chosen

local function count()
    local total = 0
    for _ in pairs(chosen) do
        total = total + 1
    end
    return total
end

local render

local function toggle(itemId)
    if chosen[itemId] then
        chosen[itemId] = nil
    elseif options.limit ~= nil and count() >= options.limit then
        problem:SetText(OVER_ALLOWANCE:format(VXV.Count(options.limit, "SR", "SR")))
        return
    else
        chosen[itemId] = true
    end
    problem:SetText("")
    render(true)
end

function render(keepScroll)
    local rows, boss = {}, nil
    for _, item in ipairs(options.items) do
        if item.boss ~= boss then
            boss = item.boss
            rows[#rows + 1] = { kind = "header", text = boss }
        end
        local link = "item:" .. item.itemId
        if options.disabled[item.itemId] then
            rows[#rows + 1] = { kind = "line", link = link,
                text = Theme.Colored(item.name .. " (" .. options.disabledLabel .. ")", "muted") }
        else
            local on = chosen[item.itemId] == true
            local mark = on and Theme.Colored("[x] ", "gold") or "[  ] "
            rows[#rows + 1] = { kind = "line", link = link,
                text = mark .. Theme.Colored(item.name, on and "gold" or "epic"),
                onClick = function()
                    toggle(item.itemId)
                end }
        end
    end
    if #rows == 0 then
        rows[1] = { kind = "line", text = NO_LOOT }
    end
    list.SetRows(rows, keepScroll)
    counter:SetText(options.counter(count()))
end

local function send()
    local reason = (reasonBox:GetText() or ""):match("^%s*(.-)%s*$")
    if options.reasonNeeded and reason == "" then
        problem:SetText(NO_REASON)
        return
    end
    options.onSend(chosen, reason)
    frame:Hide()
end

local function build()
    local body
    frame, body = VXV.CreateDialog("VXV_ItemChoice", WIDTH, HEIGHT, "")
    local listArea = CreateFrame("Frame", nil, body)
    listArea:SetPoint("TOPLEFT")
    listArea:SetSize(body:GetWidth(), body:GetHeight() - FOOTER_HEIGHT)
    list = RowList.Create(listArea)
    counter = Theme.Text(body, "textBold", 13, "gold")
    counter:SetPoint("TOPLEFT", listArea, "BOTTOMLEFT", 0, -FIELD_PADDING)
    reasonHolder = CreateFrame("Frame", nil, body)
    reasonHolder:SetPoint("BOTTOMLEFT", 0, BUTTON_HEIGHT + 2 * FIELD_PADDING)
    reasonHolder:SetSize(body:GetWidth(), FIELD_HEIGHT)
    Theme.Fill(reasonHolder, "night"):SetAllPoints()
    Theme.Rings(reasonHolder, { { "line", 1 } }, true)
    reasonBox = CreateFrame("EditBox", nil, reasonHolder)
    reasonBox:SetPoint("TOPLEFT", FIELD_PADDING, 0)
    reasonBox:SetPoint("BOTTOMRIGHT", -FIELD_PADDING, 0)
    reasonBox:SetFontObject(Theme.Font("text", 13))
    reasonBox:SetAutoFocus(false)
    reasonBox:SetMaxLetters(REASON_LETTERS)
    reasonBox:SetScript("OnEscapePressed", reasonBox.ClearFocus)
    reasonBox:SetScript("OnEnterPressed", reasonBox.ClearFocus)
    problem = Theme.Text(body, "text", 13, "loss")
    problem:SetPoint("BOTTOMLEFT", 0, (BUTTON_HEIGHT - 13) / 2)
    local button = Theme.Button(body, "pixel", "Envoyer", BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("BOTTOMRIGHT")
    button:SetScript("OnClick", send)
end

--- Opens the choice: { title, items = { itemId, name, boss }, chosen = set of item ids, limit (or nil),
--- disabled = set of item ids, disabledLabel, counter(count) = its text, reasonNeeded, onSend(chosen, reason) }.
function ItemChoice.Open(choice)
    if frame == nil then
        build()
    end
    options = choice
    chosen = {}
    for itemId in pairs(choice.chosen) do
        chosen[itemId] = true
    end
    frame.title:SetText(choice.title)
    reasonHolder:SetShown(choice.reasonNeeded == true)
    reasonBox:SetText("")
    problem:SetText("")
    render(false)
    frame:Show()
end
