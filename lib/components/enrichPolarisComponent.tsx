import React, { useEffect, useId, useImperativeHandle, useRef } from "react";
// @ts-expect-error "No types for this package"
import toStyle from "@immutabl3/to-style"; // Required for style manipulation
// @ts-expect-error "No types for this package"
import css from "dom-css"; // Required for style setting on the DOM element

/**
 * Higher-order component that adds a ref and style and className manipulation capabilities to any Polaris component
 * that doesn't natively support style props or needs DOM manipulation for styles.
 *
 * See the issue of why this is required at: https://github.com/Shopify/polaris/issues/1083
 *
 * Adding the ref based on the brilliant comment at: https://github.com/Shopify/polaris/issues/1083#issuecomment-1878858991
 *
 * Example usage:
 *
 * Wrap the component you want to enhance with this function to allow it to take a `ref` and `style` prop:
 * Note: This **must** be done outside of the component you use it in to avoid re-creating it on every render...
 * e.g. outside of the component definition function, or in a separate file and import it.
 *
 * ```tsx
 * const SortableIndexTableRow = enrichPolarisComponent<
 *   IndexTableRowProps & { children?: React.ReactNode },
 *   HTMLTableRowElement
 * >(IndexTable.Row);
 * ```
 *
 * then use the wrapped component *instead* of the original Polaris component,
 * passing in your additional `ref` and `style` and `className` props:
 *
 * ```tsx
 * <SortableIndexTableRow
 *   // Original props that are passed to the original component:
 *   key={id}
 *   position={index}
 *   // New props that couldn't be set on the original component:
 *   ref={setNodeRef}
 *   style={{ backgroundColor: "red" }}
 *   className="custom-class another-class"
 *   // Note: No point passing an id prop here, as it will be set automatically by the `enrichPolarisComponent` wrapper
 *   // to ensure the id is unique:
 *   // id={id}
 * >
 * ```
 *
 * @param WrappedComponent The component to enhance with style capabilities
 * @returns A new component with ref forwarding and style handling
 */
export function enrichPolarisComponent<
  P extends object,
  T extends HTMLElement = HTMLElement
>(WrappedComponent: React.ComponentType<P>) {
  type EnhancedProps = P & {
    id?: string; // Optional id prop to allow for custom IDs
    style?: React.CSSProperties;
    className?: string; // Added className prop to allow for custom CSS classes
    forwardedRef?: React.ForwardedRef<T>;
  };

  const EnrichPolarisComponent = (props: EnhancedProps) => {
    const { style, className, forwardedRef, ...restProps } = props;

    // Use a mutable ref object to track the DOM element
    const domElementRef = useRef<HTMLElement | null>(null);

    // Add a ref to store the initial style properties
    const initialStyleRef = useRef<Record<string, string>>({});

    // Add a ref to store the initial class names
    const initialClassNamesRef = useRef<string>("");

    // Generate a unique ID for DOM access
    const id = useId();

    // Set the current value of the ref to the element with the given id
    // if it exists in the DOM and hasn't already been set
    if (!domElementRef.current && document.getElementById(id)) {
      domElementRef.current = document.getElementById(id);

      // Store initial style properties when element is first referenced
      if (domElementRef.current?.style) {
        const styleObj: Record<string, string> = {};
        for (let i = 0; i < domElementRef.current.style.length; i++) {
          const prop = domElementRef.current.style[i]; // Note: Will be in kebab-case.
          styleObj[prop] = domElementRef.current.style.getPropertyValue(prop);
        }
        initialStyleRef.current = styleObj;
        // console.log(
        //   "🔎 > EnrichPolarisComponent > initial styleObj:",
        //   styleObj,
        // );
      }

      // Store initial class names when element is first referenced
      if (domElementRef.current?.className) {
        initialClassNamesRef.current = domElementRef.current.className;
        // console.log(
        //   "🔎 > EnrichPolarisComponent > initial class names:",
        //   initialClassNamesRef.current
        // );
      }
    }

    // Expose the ref to the parent component
    useImperativeHandle(forwardedRef, () => document.getElementById(id) as T);

    // Apply styles to the DOM element when the style prop changes
    useEffect(() => {
      if (!domElementRef.current?.style) {
        // console.warn(
        //   "DOM element not found or style property is not available.",
        //   id
        // );
        return;
      }

      // Split the passed in style prop into set and unset styles:
      const setStyles = {} as Record<string, string | number | undefined>;
      const unsetStyles = {} as Record<string, string | number | undefined>;
      for (const key in style) {
        const keyOf = key as keyof React.CSSProperties; // Type assertion to avoid TS error
        if (style[keyOf]) {
          setStyles[key] = style[keyOf];
        } else {
          unsetStyles[key] = style[keyOf];
        }
      }
      // console.log("unsetStyles:", unsetStyles);
      // console.log("setStyles:", setStyles);

      // Merge the initial styles with the new set styles, and sanitize the values with `toStyle`:
      // The new set styles will override the initial styles in case of a conflict:
      const mergedStyles = toStyle({
        ...initialStyleRef.current,
        ...setStyles,
      });
      // console.log("🔎 > useEffect > mergedStyles:", mergedStyles);

      //// Update the styles on the DOM element: ////

      // 1. Clear the styles of any `undefined` or `null` values:
      // console.log("Removing unset style properties:", unsetStyles);
      for (const property in unsetStyles) {
        // console.log("Removing unset style property:", property);
        // @ts-expect-error "TS thinks this can only be indexed via a number"
        domElementRef.current.style[property] = null; // Note: We use this syntax instead of `removeProperty` to avoid issues with the property names being in camelCase.
        // as: domElementRef.current.style.removeProperty(property) <- only works for kebab-case properties...
      }

      // 2. Clear the styles of any styles currently on the element that are not in the new mergedStyles:
      for (let i = 0; i < domElementRef.current.style.length; i++) {
        const property = domElementRef.current.style[i];
        if (!(property in mergedStyles)) {
          // console.log("Removing previously set style property:", property);
          domElementRef.current.style.removeProperty(property); // This works as the property names are in kebab-case (as they're coming from the `current.style` object).
        }
      }

      // 3. Finally, apply the merged styles to the element using the `dom-css` package,
      // which works with camelCase and kebab-case properties, and handles adding `px` to numbers, etc.
      // console.log("Applying styles using dom-css:", mergedStyles);
      css(domElementRef.current, mergedStyles);
    }, [style]);

    // Apply class names to the DOM element when the className prop changes
    useEffect(() => {
      if (!domElementRef.current) {
        return;
      }

      // If we have a className prop, append it to the initial class names
      if (className) {
        // console.log("Applying class names:", className);

        // Ensure we're not duplicating classes by starting with initial classes
        const baseClasses = initialClassNamesRef.current
          .split(" ")
          .filter(Boolean);
        // console.log("Base classes:", baseClasses);

        const newClasses = className.split(" ").filter(Boolean);
        // console.log("New classes:", newClasses);

        // Combine initial and new classes, removing duplicates
        const combinedClasses = Array.from(
          new Set([...baseClasses, ...newClasses])
        );
        // console.log("Combined classes:", combinedClasses.join(" "));

        // Set the className on the DOM element
        domElementRef.current.className = combinedClasses.join(" ");
      } else {
        // If no className is provided, restore the initial class names
        // console.log(
        //   "No className provided, restoring initial class names:",
        //   initialClassNamesRef.current
        // );
        domElementRef.current.className = initialClassNamesRef.current;
      }
    }, [className]);

    return <WrappedComponent {...(restProps as P)} id={id} />;
  };

  // Create a wrapper that handles ref forwarding
  const ForwardRefComponent = React.forwardRef<
    T,
    Omit<EnhancedProps, "forwardedRef" | "id">
  >((props, ref) => {
    return (
      <EnrichPolarisComponent
        {...(props as EnhancedProps)}
        forwardedRef={ref}
      />
    );
  });

  // Set a display name for debugging purposes
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  ForwardRefComponent.displayName = `enrichPolarisComponent(${displayName})`;

  return ForwardRefComponent;
}
