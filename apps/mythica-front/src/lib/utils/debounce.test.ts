import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("ne déclenche qu'après le délai", () => {
		const fn = vi.fn();
		const d = debounce(fn, 1000);
		d("a");
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(999);
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(fn).toHaveBeenCalledExactlyOnceWith("a");
	});

	it("regroupe les appels rapprochés (dernier argument gagne)", () => {
		const fn = vi.fn();
		const d = debounce(fn, 1000);
		d("a");
		vi.advanceTimersByTime(500);
		d("b");
		vi.advanceTimersByTime(500);
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(500);
		expect(fn).toHaveBeenCalledExactlyOnceWith("b");
	});

	it("cancel empêche le déclenchement", () => {
		const fn = vi.fn();
		const d = debounce(fn, 1000);
		d("a");
		d.cancel();
		vi.advanceTimersByTime(2000);
		expect(fn).not.toHaveBeenCalled();
	});
});
