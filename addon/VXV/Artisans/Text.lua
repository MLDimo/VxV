local ns = select(2, ...).Artisans

--- Texts as the Artisans place compares and writes them: searched without accents nor case (the core's search),
--- written into the line formats without their separators.
local Text = {}
ns.Text = Text

--- "Œufs  aux Herbes" → "oeufs aux herbes".
Text.Fold = VXV.Fold

--- Whether a name holds every word searched, accents and case aside.
Text.Matches = VXV.Matches

--- A name as one field of a line: its separators become commas.
function Text.Field(value)
    return (tostring(value):gsub("[;\r\n]+", ", "))
end
