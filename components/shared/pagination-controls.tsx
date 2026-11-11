import { Fragment, type MouseEvent } from "react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { paginationWindow } from "@/lib/forms/pagination"
export function PaginationControls({
  page,
  totalPages,
  label,
  href,
  onNavigate,
  pending = false,
}: {
  page: number
  totalPages: number
  label: string
  href: (page: number) => string
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, page: number) => void
  pending?: boolean
}) {
  const pages = Math.max(1, totalPages),
    numbers = paginationWindow(page, pages)
  function handle(event: MouseEvent<HTMLAnchorElement>, next: number) {
    if (pending || next < 1 || next > pages) {
      event.preventDefault()
      return
    }
    onNavigate(event, next)
  }
  return (
    <Pagination aria-label={label} className="mx-0 w-auto">
      <PaginationContent className="flex-wrap justify-center">
        <PaginationItem>
          <PaginationPrevious
            text="Prev"
            showTextOnMobile
            href={href(Math.max(1, page - 1))}
            aria-disabled={pending || page <= 1}
            tabIndex={pending || page <= 1 ? -1 : undefined}
            className="h-11 min-w-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
            onClick={(event) => {
              if (page <= 1) event.preventDefault()
              else handle(event, page - 1)
            }}
          />
        </PaginationItem>
        {numbers.map((number, index) => (
          <Fragment key={number}>
            {index > 0 && number - numbers[index - 1] > 1 ? (
              <PaginationItem className="hidden sm:block">
                <PaginationEllipsis />
              </PaginationItem>
            ) : null}
            <PaginationItem
              className={number !== page ? "hidden sm:block" : undefined}
            >
              <PaginationLink
                href={href(number)}
                isActive={number === page}
                aria-label={`Page ${number}`}
                aria-disabled={pending}
                tabIndex={pending ? -1 : undefined}
                className="size-11 aria-disabled:opacity-40"
                onClick={(event) => handle(event, number)}
              >
                {number}
              </PaginationLink>
            </PaginationItem>
          </Fragment>
        ))}
        <PaginationItem>
          <PaginationNext
            showTextOnMobile
            href={href(Math.min(pages, page + 1))}
            aria-disabled={pending || page >= pages}
            tabIndex={pending || page >= pages ? -1 : undefined}
            className="h-11 min-w-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
            onClick={(event) => {
              if (page >= pages) event.preventDefault()
              else handle(event, page + 1)
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
