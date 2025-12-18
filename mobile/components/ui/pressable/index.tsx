'use client';
import React from 'react';
import { Pressable as RNPressable } from 'react-native';

import { tva } from '@gluestack-ui/utils/nativewind-utils';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

const pressableStyle = tva({
  base: 'data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-indicator-info data-[focus-visible=true]:ring-2 data-[disabled=true]:opacity-40',
});

type IPressableProps = React.ComponentProps<typeof RNPressable> &
  VariantProps<typeof pressableStyle>;

const Pressable = React.forwardRef<
  React.ComponentRef<typeof RNPressable>,
  IPressableProps
>(function Pressable({ className, disabled, ...props }, ref) {
  return (
    <RNPressable
      {...props}
      ref={ref}
      disabled={disabled}
      className={pressableStyle({
        class: className,
      })}
    />
  );
});

Pressable.displayName = 'Pressable';
export { Pressable };
