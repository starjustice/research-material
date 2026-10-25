// Small helper for the exercises. It turns React Native style objects into a Yoga tree
// and returns where every box ends up. You do not need to edit this file.
import * as E from "yoga-layout";

const Yoga = { ...E, Node: E.default.Node };

const enums = {
  flexDirection: { column: Yoga.FlexDirection.Column, row: Yoga.FlexDirection.Row, "column-reverse": Yoga.FlexDirection.ColumnReverse, "row-reverse": Yoga.FlexDirection.RowReverse },
  justifyContent: { "flex-start": Yoga.Justify.FlexStart, center: Yoga.Justify.Center, "flex-end": Yoga.Justify.FlexEnd, "space-between": Yoga.Justify.SpaceBetween, "space-around": Yoga.Justify.SpaceAround, "space-evenly": Yoga.Justify.SpaceEvenly },
  alignItems: { "flex-start": Yoga.Align.FlexStart, center: Yoga.Align.Center, "flex-end": Yoga.Align.FlexEnd, stretch: Yoga.Align.Stretch },
  alignSelf: { auto: Yoga.Align.Auto, "flex-start": Yoga.Align.FlexStart, center: Yoga.Align.Center, "flex-end": Yoga.Align.FlexEnd, stretch: Yoga.Align.Stretch },
  flexWrap: { nowrap: Yoga.Wrap.NoWrap, wrap: Yoga.Wrap.Wrap },
};

const setters = {
  flexDirection: (n, v) => n.setFlexDirection(enums.flexDirection[v]),
  justifyContent: (n, v) => n.setJustifyContent(enums.justifyContent[v]),
  alignItems: (n, v) => n.setAlignItems(enums.alignItems[v]),
  alignSelf: (n, v) => n.setAlignSelf(enums.alignSelf[v]),
  flexWrap: (n, v) => n.setFlexWrap(enums.flexWrap[v]),
  flex: (n, v) => n.setFlex(v),
  flexGrow: (n, v) => n.setFlexGrow(v),
  flexShrink: (n, v) => n.setFlexShrink(v),
  flexBasis: (n, v) => n.setFlexBasis(v),
  width: (n, v) => n.setWidth(v),
  height: (n, v) => n.setHeight(v),
  gap: (n, v) => n.setGap(Yoga.Gutter.All, v),
  rowGap: (n, v) => n.setGap(Yoga.Gutter.Row, v),
  columnGap: (n, v) => n.setGap(Yoga.Gutter.Column, v),
  padding: (n, v) => n.setPadding(Yoga.Edge.All, v),
  margin: (n, v) => n.setMargin(Yoga.Edge.All, v),
  position: (n, v) => n.setPositionType(v === "absolute" ? Yoga.PositionType.Absolute : Yoga.PositionType.Relative),
  top: (n, v) => n.setPosition(Yoga.Edge.Top, v),
  left: (n, v) => n.setPosition(Yoga.Edge.Left, v),
  right: (n, v) => n.setPosition(Yoga.Edge.Right, v),
  bottom: (n, v) => n.setPosition(Yoga.Edge.Bottom, v),
  aspectRatio: (n, v) => n.setAspectRatio(v),
};

function build(spec) {
  const node = Yoga.Node.create();
  for (const [key, value] of Object.entries(spec.style || {})) {
    if (!setters[key]) throw new Error(`The checker does not know the style "${key}" yet.`);
    if (!(key in enums) || value in enums[key]) setters[key](node, value);
    else throw new Error(`"${value}" is not a valid value for ${key}.`);
  }
  (spec.children || []).forEach((child, i) => node.insertChild(build(child), i));
  spec.node = node;
  return node;
}

function read(spec, ox, oy) {
  const l = spec.node.getComputedLayout();
  const x = ox + l.left;
  const y = oy + l.top;
  return { x, y, w: l.width, h: l.height, children: (spec.children || []).map((c) => read(c, x, y)) };
}

/** Lays out one parent with the given child styles on a screen of width x height. */
export function layoutOf(containerStyle, childStyles, width = 300, height = 600) {
  const spec = { style: containerStyle || {}, children: childStyles.map((style) => ({ style: style || {} })) };
  const root = build(spec);
  root.calculateLayout(width, height, Yoga.Direction.LTR);
  const result = read(spec, 0, 0).children.map(({ x, y, w, h }) => ({ x, y, w, h }));
  root.freeRecursive();
  return result;
}
