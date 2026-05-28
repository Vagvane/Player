import type { FC } from 'react';

/**
 * Site-wide footer.
 *
 * Displays a dynamic copyright line alongside About / Privacy / Terms links.
 * The layout stacks vertically on mobile and lays out horizontally from the
 * `md` breakpoint up. `mt-auto` lets the footer hug the bottom of a flex
 * column page shell even when content is short.
 */
const Footer: FC = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Neuroflix. All rights reserved.
          </p>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              About
            </a>
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
