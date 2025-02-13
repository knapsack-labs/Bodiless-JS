/**
 * Copyright © 2020 Johnson & Johnson
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, {
  useContext, useState, FC, useRef, useEffect, useCallback, useMemo,
} from 'react';
import querystring from 'query-string';
import { HOC } from '@bodiless/fclasses';
import SearchClient from '../SearchClient';
import { TSearchResults, Suggestion } from '../types';
// import getSearchPagePath from './getSearchPagePath';

type TSearchResultContextValue = {
  results: TSearchResults,
  setResult: React.Dispatch<React.SetStateAction<TSearchResults>>,
  searchTerm: string,
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>,
  suggest: (term: string) => Suggestion[],
};

const conf = JSON.parse(process.env.BODILESS_SEARCH_PARAMS || '{}');
const searchClient = new SearchClient(conf);

/**
 * Search result context
 */
const defaultSearchResults: TSearchResultContextValue = {
  results: [],
  setResult: () => {},
  searchTerm: '',
  setSearchTerm: () => '',
  suggest: () => [],
};
const searchResultContext = React.createContext<TSearchResultContextValue>(defaultSearchResults);
export const useSearchResultContext = () => useContext(searchResultContext);
export const SearchResultProvider: FC = ({ children }) => {
  const [results, setResult] = useState<TSearchResults>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const search = (term: string) => {
    const searchResult = searchClient.search(term);
    setResult(searchResult);
  };

  const didMountRef = useRef(false);
  const searchTermRef = useRef('');

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      const q = querystring.parseUrl(window.location.href, {
        parseFragmentIdentifier: true,
      }).fragmentIdentifier || '';
      if (typeof q === 'string') {
        searchClient.loadIndex().then(() => {
          setSearchTerm(q);
        });
      }

      if (q === '') {
        search(q);
      }
    } else if (searchTermRef.current !== searchTerm) {
      searchClient.loadIndex().then(() => {
        search(searchTerm);
        searchTermRef.current = searchTerm;
      });
    }
  });

  const suggest = useCallback((queryString: string) => searchClient.suggest(queryString), []);

  const contextValue: TSearchResultContextValue = {
    results,
    setResult,
    searchTerm,
    setSearchTerm,
    suggest,
  };

  return useMemo(() => (
    <searchResultContext.Provider value={contextValue}>
      {children}
    </searchResultContext.Provider>
  ), [results]);
};

export const withSearchResult: HOC = Component => {
  const WithSearchResult: FC<any> = props => (
    <SearchResultProvider>
      <Component {...props} />
    </SearchResultProvider>
  );
  return WithSearchResult;
};
