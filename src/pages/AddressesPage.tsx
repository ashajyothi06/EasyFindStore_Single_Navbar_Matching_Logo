import {

  useCallback,

  useEffect,

  useRef,

  useState,

} from "react";

import {

  Link,

  useLocation,

  useNavigate,

} from "react-router-dom";



import {

  ApiRequestError,

  deleteAddress,

  getAddresses,

  setDefaultAddress,

} from "../lib/api";

import type {

  AddressesPayload,

  SavedAddress,

} from "../types/commerce";



const EMPTY_ADDRESSES: AddressesPayload = {

  success: true,

  authenticated: true,

  addresses: [],

  count: 0,

  csrf_token: "",

};



const ADDRESSES_PAGE_STYLES = `

  @import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");

  .react-addresses-page {

    --addresses-olive: #33371b;

    --addresses-olive-hover: #454b24;

    --addresses-olive-soft: #eef0e6;

    --addresses-ink: #242815;

    --addresses-muted: #626856;

    --addresses-border: #d9ddcc;
    --addresses-page-gutter: clamp(10px, 2vw, 36px);

    width: 100%;

    padding: 32px var(--addresses-page-gutter) 56px;

    box-sizing: border-box;

    background: #f7f7f2;

    color: var(--addresses-ink);

    font-family: "Nunito", Arial, Helvetica, sans-serif;

  }



  .react-addresses-page *,

  .react-addresses-page *::before,

  .react-addresses-page *::after {

    box-sizing: border-box;

    font-family: "Nunito", Arial, Helvetica, sans-serif !important;

  }



  .addresses-page-heading {

    display: flex;

    align-items: flex-end;

    justify-content: space-between;

    gap: 24px;

    margin-bottom: 24px;

  }



  .addresses-page-eyebrow {

    display: block;

    margin-bottom: 8px;

    color: var(--addresses-olive);

    font-size: 0.78rem;

    font-weight: 850;

    letter-spacing: 0.09em;

    text-transform: uppercase;

  }



  .addresses-page-heading h1 {

    margin: 0;

    color: var(--addresses-ink);

    font-size: clamp(2rem, 4vw, 3.15rem);

    line-height: 1.05;

    letter-spacing: -0.04em;

  }



  .addresses-page-heading p {

    margin: 10px 0 0;

    color: var(--addresses-muted);

  }



  .addresses-page-button {

    min-height: 42px;

    display: inline-flex;

    align-items: center;

    justify-content: center;

    padding: 10px 16px;

    border: 1px solid transparent;

    border-radius: 11px;

    font: inherit;

    font-size: 0.86rem;

    font-weight: 780;

    text-decoration: none;

    cursor: pointer;

    transition:

      transform 150ms ease,

      background-color 150ms ease,

      border-color 150ms ease;

  }



  .addresses-page-button:hover {

    transform: translateY(-1px);

  }



  .addresses-page-button:disabled {

    cursor: wait;

    opacity: 0.6;

    transform: none;

  }



  .addresses-page-button-primary {

    border-color: var(--addresses-olive);

    background: var(--addresses-olive);

    color: #ffffff;

    box-shadow: 0 10px 24px rgba(51, 55, 27, 0.2);

  }



  .addresses-page-button-primary:hover {

    border-color: var(--addresses-olive-hover);

    background: var(--addresses-olive-hover);

    color: #ffffff;

  }



  .addresses-page-button-secondary {

    border-color: var(--addresses-border);

    background: #ffffff;

    color: var(--addresses-ink);

  }



  .addresses-page-button-secondary:hover {

    border-color: var(--addresses-olive);

    background: var(--addresses-olive-soft);

  }



  .addresses-page-button-success {

    border-color: var(--addresses-border);

    background: var(--addresses-olive-soft);

    color: var(--addresses-olive);

  }



  .addresses-page-button-success:hover {

    border-color: var(--addresses-olive);

    background: var(--addresses-olive);

    color: #ffffff;

  }



  .addresses-page-button-danger {

    border-color: #fecaca;

    background: #fff5f5;

    color: #b42332;

  }



  .addresses-page-button:focus-visible {

    outline: 3px solid rgba(51, 55, 27, 0.22);

    outline-offset: 2px;

  }



  .addresses-page-list {

    display: grid;

    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 18px;

  }



  .addresses-page-card {

    position: relative;

    padding: 22px;

    border: 1px solid var(--addresses-border);

    border-radius: 20px;

    background: #ffffff;

    box-shadow: 0 15px 38px rgba(51, 55, 27, 0.06);

  }



  .addresses-page-card-default {

    border-color: var(--addresses-olive);

    box-shadow: 0 15px 38px rgba(51, 55, 27, 0.1);

  }



  .addresses-page-top {

    display: flex;

    align-items: flex-start;

    justify-content: space-between;

    gap: 18px;

  }



  .addresses-page-top strong {

    color: var(--addresses-ink);

    font-size: 1.08rem;

  }



  .addresses-page-type {

    display: inline-flex;

    padding: 6px 9px;

    border-radius: 999px;

    background: #f7f7f2;

    color: var(--addresses-muted);

    font-size: 0.71rem;

    font-weight: 820;

    text-transform: capitalize;

  }



  .addresses-page-default {

    display: inline-flex;

    margin-top: 12px;

    padding: 6px 9px;

    border-radius: 999px;

    background: var(--addresses-olive-soft);

    color: var(--addresses-olive);

    font-size: 0.7rem;

    font-weight: 850;

  }



  .addresses-page-card p {

    margin: 10px 0 0;

    color: var(--addresses-muted);

    line-height: 1.52;

  }



  .addresses-page-phone {

    color: var(--addresses-ink) !important;

  }



  .addresses-page-gps {

    display: block;

    margin-top: 12px;

    color: var(--addresses-olive);

    font-size: 0.74rem;

    font-weight: 700;

  }



  .addresses-page-actions {

    display: flex;

    flex-wrap: wrap;

    gap: 9px;

    margin-top: 20px;

    padding-top: 17px;

    border-top: 1px solid var(--addresses-border);

  }



  .addresses-page-alert,

  .addresses-page-loading,

  .addresses-page-empty {

    padding: 30px 24px;

    border-radius: 20px;

    text-align: center;

  }



  .addresses-page-alert-error {

    margin-bottom: 20px;

    border: 1px solid #fecaca;

    background: #fff1f2;

    color: #9f1d2d;

    font-weight: 650;

  }



  .addresses-page-alert-success {

    margin-bottom: 20px;

    border: 1px solid var(--addresses-border);

    background: var(--addresses-olive-soft);

    color: var(--addresses-olive);

    font-weight: 650;

  }



  .addresses-page-loading,

  .addresses-page-empty {

    border: 1px solid var(--addresses-border);

    background: #ffffff;

    box-shadow: 0 18px 46px rgba(51, 55, 27, 0.07);

  }



  .addresses-page-empty > div {

    font-size: 4rem;

  }



  .addresses-page-empty h2 {

    margin: 14px 0 8px;

    color: var(--addresses-ink);

  }



  .addresses-page-empty p {

    margin: 0 auto 22px;

    max-width: 520px;

    color: var(--addresses-muted);

  }



  @media (max-width: 1000px) {

    .react-addresses-page {

      width: 100%;

      max-width: none;

      padding-top: 28px;
      padding-right: var(--addresses-page-gutter);
      padding-bottom: 50px;
      padding-left: var(--addresses-page-gutter);

    }

  }



  @media (max-width: 760px) {

    .react-addresses-page {

      min-height: 100dvh;

      padding-top: 12px;
      padding-right: var(--addresses-page-gutter);
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
      padding-left: var(--addresses-page-gutter);

      background: #f7f7f2;

    }



    /* Compact mobile heading: title + action stay in one clean row. */

    .addresses-page-heading {

      width: 100%;

      display: grid;

      grid-template-columns: minmax(0, 1fr) auto;

      align-items: center;

      gap: 10px;

      margin: 0 0 12px;

      padding: 2px 0 0;

    }



    .addresses-page-heading > div {

      min-width: 0;

    }



    .addresses-page-eyebrow,

    .addresses-page-heading p {

      display: none;

    }



    .addresses-page-heading h1 {

      margin: 0;

      font-size: clamp(1.55rem, 7vw, 1.9rem);

      line-height: 1;

      letter-spacing: -0.035em;

      white-space: nowrap;

    }



    .addresses-page-heading .addresses-page-button {

      width: auto;

      min-height: 38px;

      padding: 8px 12px;

      border-radius: 10px;

      box-shadow: none;

      font-size: .76rem;

      white-space: nowrap;

    }



    .addresses-page-alert,

    .addresses-page-loading,

    .addresses-page-empty {

      padding: 14px 12px;

      border-radius: 14px;

      font-size: .86rem;

    }



    .addresses-page-alert-error,

    .addresses-page-alert-success {

      margin-bottom: 10px;

    }



    .addresses-page-list {

      grid-template-columns: minmax(0, 1fr);

      gap: 9px;

    }



    .addresses-page-card {

      width: 100%;

      min-width: 0;

      padding: 13px;

      border-radius: 15px;

      box-shadow: 0 8px 22px rgba(51, 55, 27, .055);

    }



    .addresses-page-card-default {

      border-width: 1.5px;

      box-shadow: 0 8px 22px rgba(51, 55, 27, .085);

    }



    .addresses-page-top {

      align-items: center;

      gap: 10px;

    }



    .addresses-page-top strong {

      min-width: 0;

      font-size: 1rem;

      line-height: 1.15;

      overflow-wrap: anywhere;

    }



    .addresses-page-type {

      flex: 0 0 auto;

      padding: 5px 8px;

      font-size: .64rem;

    }



    .addresses-page-default {

      margin-top: 7px;

      padding: 4px 7px;

      font-size: .62rem;

    }



    .addresses-page-card p {

      margin-top: 7px;

      font-size: .82rem;

      line-height: 1.35;

      overflow-wrap: anywhere;

    }



    .addresses-page-phone {

      margin-top: 8px !important;

    }



    .addresses-page-gps {

      margin-top: 7px;

      font-size: .65rem;

      line-height: 1.3;

      overflow-wrap: anywhere;

    }



    .addresses-page-actions {

      display: grid;

      grid-template-columns: repeat(3, minmax(0, 1fr));

      gap: 6px;

      margin-top: 11px;

      padding-top: 10px;

    }



    .addresses-page-actions .addresses-page-button {

      width: 100%;

      min-width: 0;

      min-height: 36px;

      padding: 7px 5px;

      border-radius: 9px;

      font-size: .71rem;

      line-height: 1.05;

      white-space: normal;

    }



    /* When the address is already default there are only two actions. */

    .addresses-page-card-default .addresses-page-actions {

      grid-template-columns: repeat(2, minmax(0, 1fr));

    }



    .addresses-page-empty {

      padding: 24px 16px;

    }



    .addresses-page-empty > div {

      font-size: 2.8rem;

    }



    .addresses-page-empty h2 {

      margin: 10px 0 5px;

      font-size: 1.3rem;

    }



    .addresses-page-empty p {

      margin-bottom: 14px;

      font-size: .83rem;

      line-height: 1.4;

    }



    .addresses-page-empty .addresses-page-button {

      width: 100%;

    }

  }



  @media (max-width: 390px) {

    .react-addresses-page {

      --addresses-page-gutter: 10px;

    }



    .addresses-page-heading {

      gap: 7px;

    }



    .addresses-page-heading h1 {

      font-size: 1.45rem;

    }



    .addresses-page-heading .addresses-page-button {

      min-height: 36px;

      padding: 7px 9px;

      font-size: .7rem;

    }



    .addresses-page-card {

      padding: 11px;

      border-radius: 13px;

    }



    .addresses-page-actions {

      gap: 5px;

    }



    .addresses-page-actions .addresses-page-button {

      min-height: 34px;

      padding-inline: 3px;

      font-size: .67rem;

    }

  }

  /* ================================================================
     ADDRESSES PAGE — SAME HORIZONTAL GUTTER AS PUBLIC ORDER PAGE
     ================================================================ */
  @media (min-width: 1700px) {
    .react-addresses-page {
      --addresses-page-gutter: clamp(32px, 2.5vw, 96px);
    }
  }

  @media (max-width: 1439px) {
    .react-addresses-page {
      --addresses-page-gutter: clamp(12px, 1.8vw, 24px);
    }
  }

  @media (max-width: 900px) {
    .react-addresses-page {
      --addresses-page-gutter: clamp(10px, 2vw, 18px);
    }
  }

  @media (max-width: 700px) {
    .react-addresses-page {
      --addresses-page-gutter: 10px;
    }
  }

  @media (max-width: 390px) {
    .react-addresses-page {
      --addresses-page-gutter: 10px;
    }
  }

  .react-addresses-page,
  .addresses-page-heading,
  .addresses-page-list,
  .addresses-page-alert,
  .addresses-page-loading,
  .addresses-page-empty {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .addresses-page-heading,
  .addresses-page-list,
  .addresses-page-alert,
  .addresses-page-loading,
  .addresses-page-empty {
    width: 100%;
    margin-left: 0;
    margin-right: 0;
  }

`;

interface NavigationState {

  message?: string;

}



export function AddressesPage() {

  const navigate = useNavigate();

  const location = useLocation();



  const navigationState =

    location.state as NavigationState | null;



  const [payload, setPayload] =

    useState<AddressesPayload>(

      EMPTY_ADDRESSES,

    );



  const [loading, setLoading] =

    useState(true);



  const [pageError, setPageError] =

    useState("");



  const [successMessage, setSuccessMessage] =

    useState(

      navigationState?.message || "",

    );



  const [busyAddressId, setBusyAddressId] =

    useState("");



  const csrfTokenRef = useRef("");



  const handleApiError = useCallback(

    (error: unknown) => {

      if (error instanceof ApiRequestError) {

        if (

          error.status === 401 ||

          error.code === "AUTH_REQUIRED"

        ) {

          const next = encodeURIComponent(

            `${location.pathname}${location.search}`,

          );



          navigate(

            `${error.loginUrl || "/react/login"}?next=${next}`,

            {

              replace: true,

            },

          );



          return;

        }



        if (error.csrfToken) {

          csrfTokenRef.current =

            error.csrfToken;

        }



        const details = error.errors.length

          ? ` ${error.errors.join(" ")}`

          : "";



        setPageError(

          `${error.message}${details}`,

        );



        return;

      }



      setPageError(

        error instanceof Error

          ? error.message

          : "Unable to update addresses.",

      );

    },

    [

      location.pathname,

      location.search,

      navigate,

    ],

  );



  const applyPayload = useCallback(

    (result: AddressesPayload) => {

      setPayload(result);

      csrfTokenRef.current =

        result.csrf_token ||

        csrfTokenRef.current;

    },

    [],

  );



  const loadAddresses = useCallback(

    async () => {

      setLoading(true);

      setPageError("");



      try {

        const result = await getAddresses();

        applyPayload(result);

      } catch (error) {

        handleApiError(error);

      } finally {

        setLoading(false);

      }

    },

    [

      applyPayload,

      handleApiError,

    ],

  );



  useEffect(() => {

    const timer = window.setTimeout(() => {

      void loadAddresses();

    }, 0);



    return () => {

      window.clearTimeout(timer);

    };

  }, [loadAddresses]);



  useEffect(() => {

    if (navigationState?.message) {

      window.history.replaceState(

        {},

        document.title,

      );

    }

  }, [navigationState?.message]);



  async function runMutation(

    operation: (

      csrfToken: string,

    ) => Promise<{

      addresses: SavedAddress[];

      csrf_token: string;

      message?: string;

    }>,

  ) {

    setPageError("");

    setSuccessMessage("");



    try {

      let csrfToken =

        csrfTokenRef.current;



      if (!csrfToken) {

        const fresh =

          await getAddresses();



        applyPayload(fresh);

        csrfToken = fresh.csrf_token;

      }



      try {

        const result =

          await operation(csrfToken);



        setPayload((current) => ({

          ...current,

          addresses: result.addresses,

          count: result.addresses.length,

          csrf_token:

            result.csrf_token ||

            current.csrf_token,

        }));



        csrfTokenRef.current =

          result.csrf_token ||

          csrfTokenRef.current;



        setSuccessMessage(

          result.message ||

            "Address updated.",

        );

      } catch (error) {

        if (

          error instanceof ApiRequestError &&

          error.code === "CSRF_FAILED"

        ) {

          const fresh =

            await getAddresses();



          applyPayload(fresh);



          const result =

            await operation(

              fresh.csrf_token,

            );



          setPayload((current) => ({

            ...current,

            addresses: result.addresses,

            count: result.addresses.length,

            csrf_token:

              result.csrf_token ||

              current.csrf_token,

          }));



          csrfTokenRef.current =

            result.csrf_token ||

            csrfTokenRef.current;



          setSuccessMessage(

            result.message ||

              "Address updated.",

          );



          return;

        }



        throw error;

      }

    } catch (error) {

      handleApiError(error);

    }

  }



  async function handleSetDefault(

    address: SavedAddress,

  ) {

    setBusyAddressId(address.id);



    await runMutation(

      (csrfToken) =>

        setDefaultAddress(

          address.id,

          csrfToken,

        ),

    );



    setBusyAddressId("");

  }



  async function handleDelete(

    address: SavedAddress,

  ) {

    const confirmed = window.confirm(

      `Delete the address for ${address.recipient_name}?`,

    );



    if (!confirmed) {

      return;

    }



    setBusyAddressId(address.id);



    await runMutation(

      (csrfToken) =>

        deleteAddress(

          address.id,

          csrfToken,

        ),

    );



    setBusyAddressId("");

  }



  return (

    <>

      <style>{ADDRESSES_PAGE_STYLES}</style>



      <main className="react-addresses-page">

        <section className="addresses-page-heading">

          <div>

            <span className="addresses-page-eyebrow">

              Delivery locations

            </span>



            <h1>Saved Addresses</h1>



            <p>

              Reuse locations from previous

              orders or add a new address.

            </p>

          </div>



          <Link

            className="addresses-page-button addresses-page-button-primary"

            to="/addresses/new"

          >

            Add New Address

          </Link>

        </section>



        {pageError ? (

          <section

            className="addresses-page-alert addresses-page-alert-error"

            role="alert"

          >

            {pageError}

          </section>

        ) : null}



        {successMessage ? (

          <section

            className="addresses-page-alert addresses-page-alert-success"

            role="status"

          >

            {successMessage}

          </section>

        ) : null}



        {loading ? (

          <section className="addresses-page-loading">

            Loading saved addresses…

          </section>

        ) : payload.addresses.length ? (

          <section className="addresses-page-list">

            {payload.addresses.map(

              (address) => {

                const busy =

                  busyAddressId ===

                  address.id;



                const coordinatesAvailable =

                  address.latitude !== null &&

                  address.latitude !==

                    undefined &&

                  address.longitude !== null &&

                  address.longitude !==

                    undefined;



                return (

                  <article

                    className={[

                      "addresses-page-card",

                      address.is_default

                        ? "addresses-page-card-default"

                        : "",

                    ]

                      .filter(Boolean)

                      .join(" ")}

                    key={address.id}

                  >

                    <div className="addresses-page-top">

                      <strong>

                        {

                          address.recipient_name

                        }

                      </strong>



                      <span className="addresses-page-type">

                        {address.address_type ||

                          "other"}

                      </span>

                    </div>



                    {address.is_default ? (

                      <b className="addresses-page-default">

                        Default

                      </b>

                    ) : null}



                    <p>

                      {address.address_line1}



                      {address.address_line2

                        ? `, ${address.address_line2}`

                        : ""}

                    </p>



                    {address.landmark ? (

                      <p>

                        Landmark:{" "}

                        {address.landmark}

                      </p>

                    ) : null}



                    <p>

                      {address.city},{" "}

                      {address.state} —{" "}

                      {address.postal_code},{" "}

                      {address.country}

                    </p>



                    <p className="addresses-page-phone">

                      <strong>Phone:</strong>{" "}

                      {address.phone}

                    </p>



                    {coordinatesAvailable ? (

                      <small className="addresses-page-gps">

                        GPS: {address.latitude},{" "}

                        {address.longitude}

                      </small>

                    ) : null}



                    <div className="addresses-page-actions">

                      <Link

                        className="addresses-page-button addresses-page-button-secondary"

                        to={`/addresses/${encodeURIComponent(

                          address.id,

                        )}/edit`}

                      >

                        Edit

                      </Link>



                      {!address.is_default ? (

                        <button

                          className="addresses-page-button addresses-page-button-success"

                          type="button"

                          disabled={busy}

                          onClick={() =>

                            void handleSetDefault(

                              address,

                            )

                          }

                        >

                          {busy

                            ? "Updating…"

                            : "Set Default"}

                        </button>

                      ) : null}



                      <button

                        className="addresses-page-button addresses-page-button-danger"

                        type="button"

                        disabled={busy}

                        onClick={() =>

                          void handleDelete(

                            address,

                          )

                        }

                      >

                        {busy

                          ? "Deleting…"

                          : "Delete"}

                      </button>

                    </div>

                  </article>

                );

              },

            )}

          </section>

        ) : (

          <section className="addresses-page-empty">

            <div aria-hidden="true">📍</div>



            <h2>No saved addresses</h2>



            <p>

              Add a location now or during

              checkout.

            </p>



            <Link

              className="addresses-page-button addresses-page-button-primary"

              to="/addresses/new"

            >

              Add Address

            </Link>

          </section>

        )}

      </main>

    </>

  );

}
