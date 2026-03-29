/**
 * OOP concept hierarchy — parsed from OOP-TUTOR-HIERARCHY-FOR-CODE.html
 * This is the single source of truth for the 3D concept map node set.
 */

export type NodeType = 'root' | 'category' | 'concept' | 'shared' | 'leaf'
export type Badge = 'shared' | 'runtime' | 'compile'

export interface HierarchyNode {
  id: string
  label: string
  type: NodeType
  badge?: Badge
  children: HierarchyNode[]
}

export const OOP_HIERARCHY: HierarchyNode = {
  id: 'oop',
  label: 'OOP',
  type: 'root',
  children: [

    // ── Data Types ──────────────────────────────────────────
    {
      id: 'data-types',
      label: 'Data Types',
      type: 'category',
      badge: 'compile',
      children: [
        {
          id: 'value-types',
          label: 'Value Types',
          type: 'concept',
          children: [
            { id: 'builtin', label: 'Built-in (int, double, bool, char...)', type: 'leaf', children: [] },
            { id: 'struct', label: 'struct', type: 'leaf', children: [] },
            { id: 'enum', label: 'enum', type: 'leaf', children: [] },
          ],
        },
        {
          id: 'reference-types',
          label: 'Reference Types',
          type: 'concept',
          children: [
            { id: 'class-ref', label: 'Class', type: 'shared', badge: 'shared', children: [] },
            { id: 'abstract-class-ref', label: 'Abstract Class', type: 'shared', badge: 'shared', children: [] },
            { id: 'interface-ref', label: 'Interface', type: 'shared', badge: 'shared', children: [] },
            { id: 'string-ref', label: 'string (reference type, value-like behavior)', type: 'leaf', children: [] },
            { id: 'array-ref', label: 'array', type: 'leaf', children: [] },
          ],
        },
      ],
    },

    // ── Fundamentals ────────────────────────────────────────
    {
      id: 'fundamentals',
      label: 'Fundamentals',
      type: 'category',
      children: [
        { id: 'class-fund', label: 'Class', type: 'shared', badge: 'shared', children: [] },
        { id: 'objects', label: 'Objects', type: 'leaf', children: [] },
        { id: 'attributes', label: 'Attributes', type: 'leaf', children: [] },
        { id: 'methods-fund', label: 'Methods', type: 'shared', badge: 'shared', children: [] },
      ],
    },

    // ── Four Pillars ─────────────────────────────────────────
    {
      id: 'four-pillars',
      label: 'Four Pillars',
      type: 'category',
      children: [

        // 1. Encapsulation
        {
          id: 'encapsulation',
          label: '1. Encapsulation',
          type: 'concept',
          children: [
            {
              id: 'class-encap',
              label: 'Class',
              type: 'shared',
              badge: 'shared',
              children: [
                {
                  id: 'object-state',
                  label: 'Object State',
                  type: 'concept',
                  children: [
                    { id: 'fields', label: 'Fields (instance variables)', type: 'leaf', children: [] },
                    { id: 'properties', label: 'Properties (controlled access to fields)', type: 'leaf', children: [] },
                  ],
                },
                {
                  id: 'object-behavior',
                  label: 'Object Behavior',
                  type: 'concept',
                  children: [
                    {
                      id: 'methods-encap',
                      label: 'Methods',
                      type: 'shared',
                      badge: 'shared',
                      children: [
                        {
                          id: 'method-signature',
                          label: 'Method Signature',
                          type: 'concept',
                          children: [
                            { id: 'method-name', label: 'Method Name', type: 'leaf', children: [] },
                            { id: 'param-types', label: 'Parameter Types', type: 'leaf', children: [] },
                            { id: 'return-type', label: 'Return Type', type: 'leaf', children: [] },
                            { id: 'access-mod', label: 'Access Modifier', type: 'leaf', children: [] },
                          ],
                        },
                        {
                          id: 'constructors',
                          label: 'Constructors',
                          type: 'concept',
                          children: [
                            { id: 'default-ctor', label: 'Default Constructor', type: 'leaf', children: [] },
                            { id: 'param-ctor', label: 'Parametrized Constructor', type: 'leaf', children: [] },
                          ],
                        },
                        { id: 'instance-methods', label: 'Instance Methods', type: 'leaf', children: [] },
                        { id: 'static-methods', label: 'Static Methods', type: 'leaf', children: [] },
                        {
                          id: 'parameters',
                          label: 'Parameters',
                          type: 'concept',
                          children: [
                            { id: 'value-params', label: 'Value Parameters', type: 'leaf', children: [] },
                            { id: 'ref-params', label: 'Reference Parameters', type: 'leaf', children: [] },
                            { id: 'optional-params', label: 'Optional Parameters', type: 'leaf', children: [] },
                            { id: 'return-values', label: 'Return Values', type: 'leaf', children: [] },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'data-hiding',
              label: 'Data Hiding',
              type: 'concept',
              children: [
                {
                  id: 'access-modifiers',
                  label: 'Access Modifiers',
                  type: 'concept',
                  children: [
                    { id: 'private', label: 'Private', type: 'leaf', children: [] },
                    { id: 'protected', label: 'Protected', type: 'leaf', children: [] },
                    { id: 'public', label: 'Public', type: 'leaf', children: [] },
                    { id: 'other-mod', label: 'Other (language-specific)', type: 'leaf', children: [] },
                  ],
                },
              ],
            },
          ],
        },

        // 2. Inheritance
        {
          id: 'inheritance',
          label: '2. Inheritance',
          type: 'concept',
          children: [
            { id: 'single', label: 'Single', type: 'leaf', children: [] },
            { id: 'multilevel', label: 'Multilevel', type: 'leaf', children: [] },
            { id: 'method-overriding-inh', label: 'Method Overriding', type: 'shared', badge: 'shared', children: [] },
          ],
        },

        // 3. Polymorphism
        {
          id: 'polymorphism',
          label: '3. Polymorphism',
          type: 'concept',
          children: [
            {
              id: 'overloading',
              label: 'Overloading',
              type: 'concept',
              badge: 'compile',
              children: [
                { id: 'method-overloading', label: 'Method Overloading', type: 'leaf', children: [] },
              ],
            },
            {
              id: 'overriding',
              label: 'Overriding',
              type: 'concept',
              badge: 'runtime',
              children: [
                { id: 'method-overriding-poly', label: 'Method Overriding', type: 'shared', badge: 'shared', children: [] },
              ],
            },
            {
              id: 'subtype',
              label: 'Subtype / Inclusion',
              type: 'concept',
              badge: 'runtime',
              children: [
                { id: 'via-inheritance', label: 'via Inheritance', type: 'leaf', children: [] },
                { id: 'via-interfaces', label: 'via Interfaces', type: 'leaf', children: [] },
              ],
            },
          ],
        },

        // 4. Abstraction
        {
          id: 'abstraction',
          label: '4. Abstraction',
          type: 'concept',
          children: [
            { id: 'abstract-classes', label: 'Abstract Classes', type: 'leaf', children: [] },
            { id: 'interfaces-abs', label: 'Interfaces', type: 'leaf', children: [] },
          ],
        },
      ],
    },

    // ── Relationships ───────────────────────────────────────
    {
      id: 'relationships',
      label: 'Relationships',
      type: 'category',
      children: [
        {
          id: 'is-a',
          label: 'IS_A',
          type: 'concept',
          children: [
            {
              id: 'inheritance-extends',
              label: 'Inheritance (Extends)',
              type: 'concept',
              badge: 'shared',
              children: [
                { id: 'subclass-extends', label: 'Subclass extends Superclass', type: 'leaf', children: [] },
                { id: 'parent-child', label: 'Parent Class / Child Class', type: 'leaf', children: [] },
                { id: 'super-sub', label: 'Super Class / Sub Class', type: 'leaf', children: [] },
              ],
            },
            {
              id: 'realization',
              label: 'Realization (Implements)',
              type: 'concept',
              children: [
                { id: 'class-impl-iface', label: 'Class implements Interface', type: 'leaf', children: [] },
                { id: 'realizes', label: 'Realizes / Implements contract', type: 'leaf', children: [] },
              ],
            },
          ],
        },
        {
          id: 'has-a',
          label: 'HAS_A',
          type: 'concept',
          children: [
            {
              id: 'dependency',
              label: 'Dependency (weakest)',
              type: 'concept',
              children: [
                { id: 'dep-1', label: 'One class uses another temporarily', type: 'leaf', children: [] },
                { id: 'dep-2', label: 'Referenced class is NOT part of object state', type: 'leaf', children: [] },
                { id: 'dep-3', label: 'No instance variable of that type', type: 'leaf', children: [] },
                { id: 'dep-4', label: 'No multiplicity shown in UML', type: 'leaf', children: [] },
              ],
            },
            {
              id: 'association',
              label: 'Association',
              type: 'concept',
              children: [
                { id: 'assoc-1', label: 'Referenced class IS part of object state', type: 'leaf', children: [] },
                { id: 'assoc-2', label: 'Has instance variable of that type', type: 'leaf', children: [] },
                { id: 'assoc-3', label: 'If referenced class changes, owner may be affected', type: 'leaf', children: [] },
                {
                  id: 'composition',
                  label: 'Composition (strong ownership)',
                  type: 'concept',
                  children: [
                    { id: 'comp-1', label: 'Owner creates the object', type: 'leaf', children: [] },
                    { id: 'comp-2', label: 'Owner can destroy the object', type: 'leaf', children: [] },
                    { id: 'comp-3', label: 'No constructor injection, no setter', type: 'leaf', children: [] },
                    { id: 'comp-4', label: 'NOT about multiplicity — about ownership', type: 'leaf', children: [] },
                  ],
                },
                {
                  id: 'aggregation',
                  label: 'Aggregation (weak ownership)',
                  type: 'concept',
                  children: [
                    { id: 'agg-1', label: 'Owner uses but does NOT destroy the object', type: 'leaf', children: [] },
                    { id: 'agg-2', label: 'Object can exist independently', type: 'leaf', children: [] },
                    { id: 'agg-3', label: 'NOT about multiplicity — about ownership', type: 'leaf', children: [] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
