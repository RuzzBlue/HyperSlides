declare module 'animejs' {
  type AnimeTarget = string | Element | NodeList | HTMLElement[] | SVGElement[];

  interface AnimeParams {
    targets?: AnimeTarget;
    duration?: number;
    delay?: number | ((el: Element, i: number, total: number) => number);
    easing?: string;
    elasticity?: number;
    round?: number | boolean;
    loop?: number | boolean;
    direction?: 'normal' | 'reverse' | 'alternate';
    autoplay?: boolean;
    begin?: (anim: AnimeInstance) => void;
    complete?: (anim: AnimeInstance) => void;
    update?: (anim: AnimeInstance) => void;
    opacity?: number | number[];
    translateX?: number | string | (number | string)[];
    translateY?: number | string | (number | string)[];
    scale?: number | number[];
    rotate?: number | string | (number | string)[];
    filter?: string | string[];
    [key: string]: unknown;
  }

  interface AnimeInstance {
    play(): void;
    pause(): void;
    restart(): void;
    reverse(): void;
    seek(time: number): void;
    finished: Promise<void>;
  }

  interface AnimeStatic {
    (params: AnimeParams): AnimeInstance;
    remove(targets: AnimeTarget): void;
    get(targets: AnimeTarget, propName: string, unit?: string): string | number;
    set(targets: AnimeTarget, props: Record<string, unknown>): void;
    timeline(params?: AnimeParams): AnimeInstance & {
      add(params: AnimeParams, offset?: string | number): AnimeInstance;
    };
  }

  const anime: AnimeStatic;
  export default anime;
}
