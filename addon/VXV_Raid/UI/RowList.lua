local _, ns = ...

--- A scrolling list of text rows, shared by the Raid tab and the loot panel. A row is { kind = "title" | "header"
--- | "line", text, tooltip = { title, lines } or link = item link for the game's item tooltip, onClick or nil }.
local RowList = {}
ns.RowList = RowList

local ROW_HEIGHT = 18
local SCROLLBAR_WIDTH = 26
local FONTS = { title = "GameFontNormalLarge", header = "GameFontNormal", line = "GameFontHighlight" }

local function showTooltip(frame)
    local row = frame.row
    if row.link ~= nil then
        VXV.ShowItemTooltip(frame, "ANCHOR_RIGHT", row.link)
    elseif row.tooltip ~= nil then
        VXV.ShowTooltip(frame, "ANCHOR_RIGHT", row.tooltip.title, row.tooltip.lines)
    end
end

local function click(frame)
    if frame.row.onClick ~= nil then
        frame.row.onClick()
    end
end

--- Fills the parent frame (whose size is set) with a scrolling list; returns the list, to give it rows.
function RowList.Create(parent, topOffset)
    local scroll = CreateFrame("ScrollFrame", nil, parent, "UIPanelScrollFrameTemplate")
    scroll:SetPoint("TOPLEFT", 0, -(topOffset or 0))
    scroll:SetPoint("BOTTOMRIGHT", -SCROLLBAR_WIDTH, 0)
    local content = CreateFrame("Frame", nil, scroll)
    local width = parent:GetWidth() - SCROLLBAR_WIDTH
    content:SetWidth(width)
    scroll:SetScrollChild(content)
    local frames = {}

    local function newRow(index)
        local frame = CreateFrame("Frame", nil, content)
        frame:SetSize(width, ROW_HEIGHT)
        frame:SetPoint("TOPLEFT", 0, -(index - 1) * ROW_HEIGHT)
        frame:EnableMouse(true)
        frame:SetScript("OnEnter", showTooltip)
        frame:SetScript("OnLeave", VXV.HideTooltip)
        frame:SetScript("OnMouseUp", click)
        frame.label = frame:CreateFontString(nil, "OVERLAY", FONTS.line)
        frame.label:SetPoint("LEFT")
        frame.label:SetWidth(width)
        frame.label:SetJustifyH("LEFT")
        frame.label:SetWordWrap(false)
        frames[index] = frame
        return frame
    end

    local list = {}
    --- Shows these rows, reusing the row frames.
    function list.SetRows(rows)
        for index, row in ipairs(rows) do
            local frame = frames[index] or newRow(index)
            frame.label:SetFontObject(FONTS[row.kind])
            frame.label:SetText(row.text)
            frame.row = row
            frame:Show()
        end
        for index = #rows + 1, #frames do
            frames[index]:Hide()
        end
        content:SetHeight(#rows * ROW_HEIGHT)
    end
    return list
end
