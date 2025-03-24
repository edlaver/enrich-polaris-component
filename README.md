# enrich-polaris-component

<p align="center">
    <img alt="license" src="https://img.shields.io/github/license/edlaver/enrich-polaris-component?style=flat-square" />
    <img alt="version" src="https://img.shields.io/npm/v/enrich-polaris-component" />
    <img alt="visits" src="https://hits.deltapapa.io/github/edlaver/enrich-polaris-component.svg" />
</p>

HOC (Higher-order component) wrapper that adds a ref and style and className manipulation capabilities to any Polaris component.

Adds:

- `ref`
- `style`
- `className`

props to Polaris components.

## Install

```bash
pnpm install enrich-polaris-component
```

```bash
npm install enrich-polaris-component
```

```bash
yarn add enrich-polaris-component
```

## Why?

See the issue of why this is required at: https://github.m/Shopify/polaris/issues/1083

Adding the ref functionality based on the brilliant comment at: https://thub.com/Shopify/polaris/issues/1083#issuecomment-1878858991

## How?

First, it uses the `forwardRef` function to create a new component that can accept a `ref` prop.

Then, it uses the `useId` hook to generate a unique id for the component if one is not passed as a prop. This is important so that we can access the DOM element directly via the id.

Once we have the DOM element, we use useEffect hooks to observe changes in the style and className props and set them on the element directly, e.g. with `element.style` and `element.className`.

## Example usage:

Wrap the component you want to enhance with this function to allow it to take a `ref` and `style` and `className` prop:

> Note: This **must** be done outside of the component you use it in to avoid re-creating it on every render...
>
> e.g. outside of the component definition function, or in a separate file and import it.

### Example:

Say we want to allow an IndexTable.Row to take a `ref` so we can use the `react-beautiful-dnd` library to make it sortable by dragging.

First, import the `enrichPolarisComponent` function:

```tsx
import { enrichPolarisComponent } from "enrich-polaris-component";
```

Then, wrap the component you want to enhance - remembering to do this outside of the parent component definition function (see note above):

```jsx
const SortableIndexTableRow = enrichPolarisComponent(IndexTable.Row);
```

(or with types:)

```tsx
const SortableIndexTableRow = enrichPolarisComponent<
  IndexTableRowProps & { children?: React.ReactNode },
  HTMLTableRowElement
>(IndexTable.Row);
```

then use the **wrapped component** _instead_ of the original Polaris component, passing in your additional `ref` and `style` and `className` props in the usual way:

```tsx
<SortableIndexTableRow
  // Original props that are passed to the original component:
  id={`table-row-${id}`} // Optional, will be generated automatically if not passed
  key={id}
  position={index}

  // New props that couldn't previously be set on the original component:
  ref={setNodeRef}
  style={{ backgroundColor: "red" }}
  className="custom-class another-class"
>
```

## Implementation

See this file for the implementation: https://github.com/edlaver/enrich-polaris-component/blob/main/lib/components/enrichPolarisComponent.tsx

## Repo based on "A simple (demo) react component library"

Based on
this repository: https://github.com/receter/my-component-library which was published together with an article on [how to create a react component library](https://dev.to/receter/how-to-create-a-react-component-library-using-vites-library-mode-4lma) using Vite's library mode.
